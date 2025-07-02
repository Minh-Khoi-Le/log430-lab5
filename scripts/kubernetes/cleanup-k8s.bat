@echo off
echo ========================================
echo   LOG430 Lab 5 - Kubernetes Cleanup
echo   Removing all microservices resources
echo ========================================

echo [1/8] Removing application deployments...
kubectl delete deployment kong-gateway product-service-1 product-service-2 stock-service-1 stock-service-2 user-service store-service sales-service refund-service client 2>NUL

echo [2/8] Removing application services...
kubectl delete service kong-gateway-service product-service-1 product-service-2 product-service stock-service-1 stock-service-2 stock-service user-service store-service sales-service refund-service client-service 2>NUL

echo [3/8] Removing infrastructure services...
kubectl delete deployment postgres redis 2>NUL
kubectl delete service postgres-service redis-service 2>NUL
kubectl delete pvc postgres-pvc 2>NUL

echo [4/8] Removing monitoring services...
kubectl delete deployment prometheus grafana 2>NUL
kubectl delete service prometheus-service grafana-service 2>NUL

echo [5/8] Removing configurations...
kubectl delete configmap kong-config prometheus-config grafana-datasources 2>NUL

echo [6/8] Removing ingress...
kubectl delete ingress app-ingress 2>NUL

echo [7/8] Cleaning up remaining resources...
kubectl delete all --all 2>NUL

echo [8/8] Final cleanup...
kubectl get all

echo.
echo [OK] Kubernetes cleanup completed
echo All LOG430 Lab 5 resources have been removed
echo.
pause

echo [3/5] Removing Redis...
kubectl delete deployment redis 2>NUL
kubectl delete service redis 2>NUL

echo [4/5] Removing database...
kubectl delete deployment postgres 2>NUL
kubectl delete service postgres 2>NUL
kubectl delete pvc postgres-data 2>NUL

echo [5/5] Checking remaining resources...
echo.
echo Remaining pods:
kubectl get pods
echo.
echo Remaining services:
kubectl get services
echo.
echo Remaining persistent volume claims:
kubectl get pvc

echo ============================================
echo Cleanup complete!
echo To redeploy, run either:
echo   scripts\deploy-with-loadbalancing.bat
echo   scripts\deploy-fixed-server.bat
echo ============================================ 