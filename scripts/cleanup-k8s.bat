@echo off
echo ============================================
echo Cleaning up LOG430 Kubernetes resources
echo ============================================

echo [1/5] Removing application services...
kubectl delete deployment client client1 client2 client3 server 2>NUL
kubectl delete service client-service client1 client2 client3 server 2>NUL
kubectl delete ingress app-ingress 2>NUL

echo [2/5] Removing monitoring services...
kubectl delete deployment prometheus grafana 2>NUL
kubectl delete service prometheus grafana 2>NUL
kubectl delete configmap prometheus-config 2>NUL

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