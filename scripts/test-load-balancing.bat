@echo off
echo ============================================
echo Testing Load Balancing
echo ============================================

echo This script will:
echo 1. Check that the load-balanced deployment is running
echo 2. Run the k6 load test to verify load balancing
echo.

echo Checking if pods are running...
kubectl get pods -l app=server

echo.
echo Running load test...
echo.
k6 run ./server/tests/k6/load-balance-test.js

echo.
echo ============================================
echo To see more detailed metrics, check Prometheus and Grafana:
echo  - Prometheus: http://localhost:9090
echo  - Grafana: http://localhost:3001 (login: admin/admin)
echo.
echo Suggested Prometheus queries:
echo  - sum by(pod) (rate(requests_total_by_pod[1m]))
echo  - histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[1m])) by (pod, le))
echo ============================================ 