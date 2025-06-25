@echo off
echo ============================================
echo Rebuilding and redeploying LOG430 application
echo ============================================

echo Setting up Minikube Docker environment...
FOR /F "tokens=*" %%i IN ('.\minikube docker-env') DO %%i

echo Building Docker images...
docker build -t log430-server:latest ./server
docker build -t log430-client:latest ./client

echo Restarting deployments...
.\kubectl.exe rollout restart deployment server
.\kubectl.exe rollout restart deployment client1
.\kubectl.exe rollout restart deployment client2
.\kubectl.exe rollout restart deployment client3

echo Checking pod status...
.\kubectl.exe get pods

echo ============================================
echo Redeployment complete! Wait for pods to restart.
echo To check status: .\kubectl.exe get pods
echo ============================================ 