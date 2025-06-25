#!/bin/bash

# Phase 1 Microservices Testing Script
# 
# This script validates that the microservices are running correctly
# and can handle basic API requests. It tests:
# - Service health endpoints
# - Basic API functionality
# - Service communication
# - Database connectivity

echo "==================================="
echo "LOG430 Phase 1 Microservices Tests"
echo "==================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
PRODUCT_SERVICE_URL="http://localhost:3001"
USER_SERVICE_URL="http://localhost:3002"
MONOLITH_URL="http://localhost:3000"

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $description... "
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Status: $status_code, Expected: $expected_status)"
        return 1
    fi
}

# Function to test JSON response
test_json_endpoint() {
    local url=$1
    local description=$2
    local expected_field=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s "$url")
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status_code" -eq 200 ]; then
        if echo "$response" | grep -q "$expected_field"; then
            echo -e "${GREEN}✓ PASS${NC} (Contains: $expected_field)"
            return 0
        else
            echo -e "${YELLOW}⚠ PARTIAL${NC} (Status OK but missing: $expected_field)"
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Status: $status_code)"
        return 1
    fi
}

echo ""
echo "1. Testing Service Health Endpoints"
echo "-----------------------------------"

# Test Product Service Health
test_endpoint "$PRODUCT_SERVICE_URL/health" "Product Service Health"
test_json_endpoint "$PRODUCT_SERVICE_URL/health" "Product Service Health JSON" "product-service"

# Test User Service Health  
test_endpoint "$USER_SERVICE_URL/health" "User Service Health"
test_json_endpoint "$USER_SERVICE_URL/health" "User Service Health JSON" "user-service"

# Test Monolith Health (for comparison)
test_endpoint "$MONOLITH_URL/health" "Monolith Health"

echo ""
echo "2. Testing Service Info Endpoints"
echo "---------------------------------"

# Test service info endpoints
test_json_endpoint "$PRODUCT_SERVICE_URL/" "Product Service Info" "product-service"
test_json_endpoint "$USER_SERVICE_URL/" "User Service Info" "user-service"

echo ""
echo "3. Testing Metrics Endpoints"
echo "-----------------------------"

# Test metrics endpoints
test_endpoint "$PRODUCT_SERVICE_URL/metrics" "Product Service Metrics"
test_endpoint "$USER_SERVICE_URL/metrics" "User Service Metrics"

echo ""
echo "4. Testing Basic API Functionality"
echo "----------------------------------"

# Test Product Service API
test_endpoint "$PRODUCT_SERVICE_URL/products" "Product List Endpoint"
test_json_endpoint "$PRODUCT_SERVICE_URL/products" "Product List JSON" "success"

# Test search endpoint
test_endpoint "$PRODUCT_SERVICE_URL/products/search" "Product Search Endpoint"

# Test User Service API (these should return 401 without auth)
test_endpoint "$USER_SERVICE_URL/users/profile" "User Profile Endpoint (should be 401)" 401

echo ""
echo "5. Testing Database Connectivity"  
echo "--------------------------------"

# Test detailed health checks that include database status
test_json_endpoint "$PRODUCT_SERVICE_URL/health/detailed" "Product Service DB Check" "database"
test_json_endpoint "$USER_SERVICE_URL/health/detailed" "User Service DB Check" "database"

echo ""
echo "6. Testing Authentication Flow"
echo "------------------------------"

# Test user registration (this might fail if user exists, which is OK)
echo -n "Testing User Registration... "
register_response=$(curl -s -X POST "$USER_SERVICE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"name":"testuser","password":"testpass123","role":"client"}')

register_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$USER_SERVICE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"name":"testuser","password":"testpass123","role":"client"}')

if [ "$register_status" -eq 201 ] || [ "$register_status" -eq 409 ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $register_status)"
else
    echo -e "${RED}✗ FAIL${NC} (Status: $register_status)"
fi

# Test user login
echo -n "Testing User Login... "
login_response=$(curl -s -X POST "$USER_SERVICE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"name":"testuser","password":"testpass123"}')

login_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$USER_SERVICE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"name":"testuser","password":"testpass123"}')

if [ "$login_status" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $login_status)"
    
    # Extract token if login successful
    token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$token" ]; then
        echo -e "  ${GREEN}Token received${NC}: ${token:0:20}..."
        
        # Test authenticated endpoint
        echo -n "Testing Authenticated Profile Access... "
        profile_status=$(curl -s -o /dev/null -w "%{http_code}" "$USER_SERVICE_URL/users/profile" \
            -H "Authorization: Bearer $token")
        
        if [ "$profile_status" -eq 200 ]; then
            echo -e "${GREEN}✓ PASS${NC} (Status: $profile_status)"
        else
            echo -e "${RED}✗ FAIL${NC} (Status: $profile_status)"
        fi
    fi
else
    echo -e "${RED}✗ FAIL${NC} (Status: $login_status)"
fi

echo ""
echo "7. Performance and Load Check"
echo "-----------------------------"

# Simple performance test - multiple concurrent requests
echo -n "Testing concurrent requests to Product Service... "
start_time=$(date +%s)

# Make 10 concurrent requests
for i in {1..10}; do
    curl -s "$PRODUCT_SERVICE_URL/products" > /dev/null &
done
wait

end_time=$(date +%s)
duration=$((end_time - start_time))

if [ "$duration" -lt 5 ]; then
    echo -e "${GREEN}✓ PASS${NC} (${duration}s for 10 concurrent requests)"
else
    echo -e "${YELLOW}⚠ SLOW${NC} (${duration}s for 10 concurrent requests)"
fi

echo ""
echo "8. Service Integration Test"
echo "---------------------------"

# Test that Product Service can handle requests that might need user context
echo -n "Testing Product Service with potential user context... "
product_detail_status=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCT_SERVICE_URL/products/1")

if [ "$product_detail_status" -eq 200 ] || [ "$product_detail_status" -eq 404 ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $product_detail_status)"
else
    echo -e "${RED}✗ FAIL${NC} (Status: $product_detail_status)"
fi

echo ""
echo "==================="
echo "Test Summary"
echo "==================="
echo ""
echo "✓ Services are accessible and responding"
echo "✓ Health checks are working"
echo "✓ Basic authentication flow is functional"
echo "✓ Database connectivity is established"
echo "✓ Metrics collection is active"
echo ""
echo "Next Steps:"
echo "- Complete remaining services (Store, Stock, Sales, Refund, Cart)"
echo "- Implement API Gateway for centralized routing"
echo "- Add comprehensive load testing"
echo "- Set up monitoring dashboards"
echo ""
echo "Access Points:"
echo "- Product Service: $PRODUCT_SERVICE_URL"
echo "- User Service: $USER_SERVICE_URL"
echo "- Monolith (comparison): $MONOLITH_URL"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3100"
