@echo off
echo ========================================
echo   LOG430 Lab 5 - Minikube Setup
echo   Microservices Architecture
echo ========================================

echo Checking if Minikube is running...
minikube status
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Minikube is not running. Starting Minikube...
    echo.
    minikube start --driver=docker --memory=4096 --cpus=2
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to start Minikube
        pause
        goto :EOF
    )
)

echo [OK] Minikube is running
echo.

echo Enabling required addons...
minikube addons enable ingress
minikube addons enable metrics-server

echo Setting up Docker environment for Minikube...
FOR /F "tokens=*" %%i IN ('minikube docker-env') DO %%i

echo [OK] Minikube setup completed
echo.
echo Ready to deploy with: scripts\deploy-k8s.bat
echo.
pause

echo Setting up Minikube Docker environment...
echo FOR /F "tokens=*" %%i IN ('minikube -p minikube docker-env') DO %%i
FOR /F "tokens=*" %%i IN ('minikube -p minikube docker-env') DO %%i

echo Verifying Docker connection...
docker ps
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Could not connect to Docker. Please check Docker is running.
    goto :EOF
)

echo Building server image...
docker build -t log430-server:latest ./server
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build server image. See error message above.
    goto :EOF
)

echo Building client image...
docker build -t log430-client:latest ./client
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build client image. See error message above.
    goto :EOF
)

echo ============================================
echo Images built successfully!
echo ============================================ 