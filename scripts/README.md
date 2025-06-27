# LOG430 Lab 5 - Centralized Scripts Guide

This directory contains all the centralized scripts for managing the LOG430 Lab 5 Load Balanced Microservices System.

## Quick Start

### Choose Your Deployment Method

```bash
# Interactive deployment selector
scripts\quick-start.bat
```

This will present you with two deployment options:

### Docker Compose Deployment (Recommended for Development)

- **Fast setup** - Get running in minutes
- **Local development** - Easy to modify and test
- **Resource friendly** - Lower resource usage
- **Quick start**: `scripts\docker\quick-start-docker.bat`

### Kubernetes Deployment (Production-like)

- **Production environment** - Similar to real deployment
- **Advanced features** - Auto-scaling, health checks, rolling updates
- **Minikube required** - Local Kubernetes cluster
- **Quick start**: `scripts\kubernetes\quick-start-k8s.bat`

## Script Organization

### **scripts/docker/** - Docker Compose Scripts

| Script                   | Description                       | Use When               |
| ------------------------ | --------------------------------- | ---------------------- |
| `quick-start-docker.bat` | Interactive Docker menu           | Full Docker management |
| `start-gateway.bat`      | Start API Gateway + Microservices | Backend services       |
| `start-frontend.bat`     | Start frontend client             | Frontend development   |
| `stop-gateway.bat`       | Stop all Docker services          | Shutdown system        |
| `clean-restart.bat`      | Clean restart (removes data)      | Fresh start needed     |
| `test-gateway.bat`       | Test gateway & load balancing     | Verify functionality   |
| `system-status.bat`      | Check Docker system status        | Health monitoring      |
| `view-logs.bat`          | View service logs                 | Debugging              |
| `load-test.bat`          | Performance testing               | Load testing           |

### **scripts/kubernetes/** - Kubernetes Scripts

| Script                        | Description                 | Use When                |
| ----------------------------- | --------------------------- | ----------------------- |
| `quick-start-k8s.bat`         | Interactive Kubernetes menu | Full K8s management     |
| `setup-minikube.bat`          | Setup Minikube environment  | First-time K8s setup    |
| `deploy-k8s.bat`              | Deploy all services to K8s  | Full deployment         |
| `cleanup-k8s.bat`             | Remove all K8s resources    | Clean environment       |
| `port-forward-all.bat`        | Forward all service ports   | Access services locally |
| `port-forward-monitoring.bat` | Forward monitoring ports    | Access monitoring tools |
| `system-status.bat`           | Check K8s system status     | Health monitoring       |

### **Deployment Options**

| Option             | Command                                  | Use When                             |
| ------------------ | ---------------------------------------- | ------------------------------------ |
| **Docker Compose** | `scripts\docker\quick-start-docker.bat`  | Local development, quick setup       |
| **Kubernetes**     | `scripts\kubernetes\quick-start-k8s.bat` | Production-like environment, scaling |

## Getting Started

### Docker Compose (Recommended for Development)

```bash
# 1. Interactive menu (easiest)
scripts\docker\quick-start-docker.bat

# 2. Direct commands (advanced)
scripts\docker\start-gateway.bat      # Start backend
scripts\docker\start-frontend.bat     # Start frontend
scripts\docker\test-gateway.bat       # Test system
```

### Kubernetes (Production-like)

```bash
# 1. Interactive menu (easiest)
scripts\kubernetes\quick-start-k8s.bat

# 2. Step-by-step setup
scripts\kubernetes\setup-minikube.bat      # Setup environment
scripts\kubernetes\deploy-k8s.bat          # Deploy services
scripts\kubernetes\port-forward-all.bat    # Access services
```

## System Architecture

The scripts manage this load-balanced architecture:

```text
Frontend (Port 3000)
        ↓
Kong API Gateway (Port 8000)
        ↓
Load Balanced Services (2 instances each)
├── Product Service (3001, 3011)
├── Stock Service (3004, 3014)
└── Cart Service (3007, 3017)
        ↓
Single Instance Services
├── User Service (3002)
├── Store Service (3003)
├── Sales Service (3005)
└── Refund Service (3006)
        ↓
Infrastructure
├── PostgreSQL Database
├── Redis Cache
├── Prometheus (9090)
└── Grafana (3001)
```

## 🎮 Usage Examples

### Scenario 1: First Time Setup (Docker)

```bash
# Interactive guided setup
scripts\quick-start.bat
# Choose option 1 (Docker)
# Follow the menu options
```

### Scenario 2: Daily Development (Docker)

```bash
# Quick start everything
scripts\docker\start-gateway.bat
# Wait 2 minutes for services to start
scripts\docker\start-frontend.bat
# Access at http://localhost:3000
```

### Scenario 3: Production Testing (Kubernetes)

```bash
# Setup Kubernetes environment
scripts\kubernetes\setup-minikube.bat
# Deploy everything
scripts\kubernetes\deploy-k8s.bat
# Access services
scripts\kubernetes\port-forward-all.bat
```

scripts\quick-start.bat

# Select option 1: "Start Complete System"

# Option B: Direct commands

scripts\start-gateway.bat
scripts\start-frontend.bat

````

### Scenario 2: Testing the System
```bash
# Check if everything is working
scripts\system-status.bat

# Test load balancing
scripts\test-gateway.bat

# Performance testing
scripts\load-test.bat
````

### Scenario 3: Debugging Issues

```bash
# Check what's running
scripts\system-status.bat

# View logs for specific services
scripts\view-logs.bat

# Clean restart if needed
scripts\clean-restart.bat
```

### Scenario 4: Daily Development Workflow

```bash
# Morning: Start everything
scripts\quick-start.bat

# During development: Check status
scripts\system-status.bat

# End of day: Stop everything
scripts\stop-gateway.bat
```

## **Access Points After Startup**

| Service         | URL                     | Credentials                       |
| --------------- | ----------------------- | --------------------------------- |
| **Frontend**    | <http://localhost:5173> | User login required               |
| **API Gateway** | <http://localhost:8000> | API Key: `frontend-app-key-12345` |
| **Kong Admin**  | <http://localhost:8001> | No auth required                  |
| **Prometheus**  | <http://localhost:9090> | No auth required                  |
| **Grafana**     | <http://localhost:3100> | admin/admin                       |

## **Environment Setup**

### Prerequisites

- **Docker Desktop** installed and running
- **Node.js** (for frontend)
- **Git Bash** or **Command Prompt** (Windows)
- **curl** and **jq** (optional, for testing scripts)

### Environment Variables

The scripts automatically handle environment configuration, but you can customize:

- **Frontend**: `client\.env`
- **Gateway**: `api-gateway\.env`

## **Troubleshooting**

### Common Issues

#### "Docker is not running"

```bash
# Solution: Start Docker Desktop and wait for it to fully load
# Then run: scripts\start-gateway.bat
```

#### "Kong Gateway is not responding"

```bash
# Check status
scripts\system-status.bat

# If not working, clean restart
scripts\clean-restart.bat
```

#### "Services not accessible"

```bash
# Check if ports are available
netstat -an | findstr ":8000\|:8001\|:5173"

# View system status
scripts\system-status.bat
```

#### "Load balancing not working"

```bash
# Test load balancing specifically
scripts\test-gateway.bat

# Check upstreams configuration
curl http://localhost:8001/upstreams
```

#### "Frontend can't connect to API"

```bash
# Verify Gateway is running
curl http://localhost:8000/api/products

# Check CORS configuration
scripts\view-logs.bat
# Select option 1: Kong Gateway logs
```

### Debug Commands

```bash
# Check Docker containers
docker ps

# Check specific service logs
scripts\view-logs.bat

# Test API directly
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products

# Check Kong configuration
curl http://localhost:8001/services
curl http://localhost:8001/routes
curl http://localhost:8001/upstreams
```

## **Performance & Monitoring**

### Built-in Monitoring

- **Prometheus**: Metrics collection at <http://localhost:9090>
- **Grafana**: Dashboards at <http://localhost:3100> (admin/admin)
- **Kong Admin**: Gateway stats at <http://localhost:8001>

### Load Testing

```bash
# Basic load testing
scripts\load-test.bat

# Advanced testing with K6
scripts\run-k6-tests.bat

# Cache performance testing
scripts\test-cache-performance.bat
```

## **Security**

### API Security

- **API Key Authentication**: All requests require `X-API-Key` header
- **JWT Tokens**: User authentication for protected endpoints
- **CORS**: Configured for frontend domain
- **Rate Limiting**: Built into Kong Gateway

### Development vs Production

- Development: Uses testing API keys
- Production: Generate secure API keys and JWT secrets

## **Additional Resources**

### Documentation

- **API Gateway**: `api-gateway\README.md`
- **Frontend**: `client\README-MICROSERVICES.md`
- **Architecture**: `docs\`

### Advanced Features

- **Kubernetes Deployment**: Use `scripts\setup-minikube.bat`
- **Security Configuration**: Use `api-gateway\apply-security-config.bat`
- **Internal Service Communication**: Configured in Kong

## **Getting Help**

1. **Interactive Guide**: Run `scripts\quick-start.bat` and select option 14
2. **System Status**: Always start with `scripts\system-status.bat`
3. **Logs**: Use `scripts\view-logs.bat` to see what's happening
4. **Documentation**: Check the README files in each directory
5. **Clean Start**: When in doubt, use `scripts\clean-restart.bat`

---

### **Database Management Scripts**

| Script                | Description                  | Use When              |
| --------------------- | ---------------------------- | --------------------- |
| `seed-database.bat`   | Seed database with test data | Fresh database setup  |
| `verify-database.bat` | Verify database contents     | Check seeding success |

#### Database Test Data

When seeded, the database includes:

- **2 Test Users**: Client (c/c) and Admin (a/a)
- **3 Sample Stores**: Downtown Electronics, Mall Tech Hub, Campus Store
- **8 Sample Products**: Various electronics with pricing
- **Stock Data**: All products available in all stores
- **Sample Transactions**: Sales and refund examples

## **scripts/docker/** - Docker Compose Scripts

| Script                   | Description                       | Use When               |
| ------------------------ | --------------------------------- | ---------------------- |
| `quick-start-docker.bat` | Interactive Docker menu           | Full Docker management |
| `start-gateway.bat`      | Start API Gateway + Microservices | Backend services       |
| `start-frontend.bat`     | Start frontend client             | Frontend development   |
| `stop-gateway.bat`       | Stop all Docker services          | Shutdown system        |
| `clean-restart.bat`      | Clean restart (removes data)      | Fresh start needed     |
| `test-gateway.bat`       | Test gateway & load balancing     | Verify functionality   |
| `system-status.bat`      | Check Docker system status        | Health monitoring      |
| `view-logs.bat`          | View service logs                 | Debugging              |
| `load-test.bat`          | Performance testing               | Load testing           |

### **scripts/kubernetes/** - Kubernetes Scripts

| Script                        | Description                 | Use When                |
| ----------------------------- | --------------------------- | ----------------------- |
| `quick-start-k8s.bat`         | Interactive Kubernetes menu | Full K8s management     |
| `setup-minikube.bat`          | Setup Minikube environment  | First-time K8s setup    |
| `deploy-k8s.bat`              | Deploy all services to K8s  | Full deployment         |
| `cleanup-k8s.bat`             | Remove all K8s resources    | Clean environment       |
| `port-forward-all.bat`        | Forward all service ports   | Access services locally |
| `port-forward-monitoring.bat` | Forward monitoring ports    | Access monitoring tools |
| `system-status.bat`           | Check K8s system status     | Health monitoring       |

### **Deployment Options**

| Option             | Command                                  | Use When                             |
| ------------------ | ---------------------------------------- | ------------------------------------ |
| **Docker Compose** | `scripts\docker\quick-start-docker.bat`  | Local development, quick setup       |
| **Kubernetes**     | `scripts\kubernetes\quick-start-k8s.bat` | Production-like environment, scaling |

## Getting Started

### Docker Compose (Recommended for Development)

```bash
# 1. Interactive menu (easiest)
scripts\docker\quick-start-docker.bat

# 2. Direct commands (advanced)
scripts\docker\start-gateway.bat      # Start backend
scripts\docker\start-frontend.bat     # Start frontend
scripts\docker\test-gateway.bat       # Test system
```

### Kubernetes (Production-like)

```bash
# 1. Interactive menu (easiest)
scripts\kubernetes\quick-start-k8s.bat

# 2. Step-by-step setup
scripts\kubernetes\setup-minikube.bat      # Setup environment
scripts\kubernetes\deploy-k8s.bat          # Deploy services
scripts\kubernetes\port-forward-all.bat    # Access services
```

## System Architecture

The scripts manage this load-balanced architecture:

```text
Frontend (Port 3000)
        ↓
Kong API Gateway (Port 8000)
        ↓
Load Balanced Services (2 instances each)
├── Product Service (3001, 3011)
├── Stock Service (3004, 3014)
└── Cart Service (3007, 3017)
        ↓
Single Instance Services
├── User Service (3002)
├── Store Service (3003)
├── Sales Service (3005)
└── Refund Service (3006)
        ↓
Infrastructure
├── PostgreSQL Database
├── Redis Cache
├── Prometheus (9090)
└── Grafana (3001)
```

## Usage Examples

### Scenario 1: First Time Setup (Docker)

```bash
# Interactive guided setup
scripts\quick-start.bat
# Choose option 1 (Docker)
# Follow the menu options
```

### Scenario 2: Daily Development (Docker)

```bash
# Quick start everything
scripts\docker\start-gateway.bat
# Wait 2 minutes for services to start
scripts\docker\start-frontend.bat
# Access at http://localhost:3000
```

### Scenario 3: Production Testing (Kubernetes)

```bash
# Setup Kubernetes environment
scripts\kubernetes\setup-minikube.bat
# Deploy everything
scripts\kubernetes\deploy-k8s.bat
# Access services
scripts\kubernetes\port-forward-all.bat
```

scripts\quick-start.bat

# Select option 1: "Start Complete System"

# Option B: Direct commands

scripts\start-gateway.bat
scripts\start-frontend.bat

````

### Scenario 2: Testing the System
```bash
# Check if everything is working
scripts\system-status.bat

# Test load balancing
scripts\test-gateway.bat

# Performance testing
scripts\load-test.bat
````

### Scenario 3: Debugging Issues

```bash
# Check what's running
scripts\system-status.bat

# View logs for specific services
scripts\view-logs.bat

# Clean restart if needed
scripts\clean-restart.bat
```

### Scenario 4: Daily Development Workflow

```bash
# Morning: Start everything
scripts\quick-start.bat

# During development: Check status
scripts\system-status.bat

# End of day: Stop everything
scripts\stop-gateway.bat
```

## **Access Points After Startup**

| Service         | URL                     | Credentials                       |
| --------------- | ----------------------- | --------------------------------- |
| **Frontend**    | <http://localhost:5173> | User login required               |
| **API Gateway** | <http://localhost:8000> | API Key: `frontend-app-key-12345` |
| **Kong Admin**  | <http://localhost:8001> | No auth required                  |
| **Prometheus**  | <http://localhost:9090> | No auth required                  |
| **Grafana**     | <http://localhost:3100> | admin/admin                       |

## **Environment Setup**

### Prerequisites

- **Docker Desktop** installed and running
- **Node.js** (for frontend)
- **Git Bash** or **Command Prompt** (Windows)
- **curl** and **jq** (optional, for testing scripts)

### Environment Variables

The scripts automatically handle environment configuration, but you can customize:

- **Frontend**: `client\.env`
- **Gateway**: `api-gateway\.env`

## **Troubleshooting**

### Common Issues

#### "Docker is not running"

```bash
# Solution: Start Docker Desktop and wait for it to fully load
# Then run: scripts\start-gateway.bat
```

#### "Kong Gateway is not responding"

```bash
# Check status
scripts\system-status.bat

# If not working, clean restart
scripts\clean-restart.bat
```

#### "Services not accessible"

```bash
# Check if ports are available
netstat -an | findstr ":8000\|:8001\|:5173"

# View system status
scripts\system-status.bat
```

#### "Load balancing not working"

```bash
# Test load balancing specifically
scripts\test-gateway.bat

# Check upstreams configuration
curl http://localhost:8001/upstreams
```

#### "Frontend can't connect to API"

```bash
# Verify Gateway is running
curl http://localhost:8000/api/products

# Check CORS configuration
scripts\view-logs.bat
# Select option 1: Kong Gateway logs
```

### Debug Commands

```bash
# Check Docker containers
docker ps

# Check specific service logs
scripts\view-logs.bat

# Test API directly
curl -H "X-API-Key: testing-key-xyz123" http://localhost:8000/api/products

# Check Kong configuration
curl http://localhost:8001/services
curl http://localhost:8001/routes
curl http://localhost:8001/upstreams
```

## **Performance & Monitoring**

### Built-in Monitoring

- **Prometheus**: Metrics collection at <http://localhost:9090>
- **Grafana**: Dashboards at <http://localhost:3100> (admin/admin)
- **Kong Admin**: Gateway stats at <http://localhost:8001>

### Load Testing

```bash
# Basic load testing
scripts\load-test.bat

# Advanced testing with K6
scripts\run-k6-tests.bat

# Cache performance testing
scripts\test-cache-performance.bat
```

## **Security**

### API Security

- **API Key Authentication**: All requests require `X-API-Key` header
- **JWT Tokens**: User authentication for protected endpoints
- **CORS**: Configured for frontend domain
- **Rate Limiting**: Built into Kong Gateway

### Development vs Production

- Development: Uses testing API keys
- Production: Generate secure API keys and JWT secrets

## **Additional Resources**

### Documentation

- **API Gateway**: `api-gateway\README.md`
- **Frontend**: `client\README-MICROSERVICES.md`
- **Architecture**: `docs\`

### Advanced Features

- **Kubernetes Deployment**: Use `scripts\setup-minikube.bat`
- **Security Configuration**: Use `api-gateway\apply-security-config.bat`
- **Internal Service Communication**: Configured in Kong

## **Getting Help**

1. **Interactive Guide**: Run `scripts\quick-start.bat` and select option 14
2. **System Status**: Always start with `scripts\system-status.bat`
3. **Logs**: Use `scripts\view-logs.bat` to see what's happening
4. **Documentation**: Check the README files in each directory
5. **Clean Start**: When in doubt, use `scripts\clean-restart.bat`
