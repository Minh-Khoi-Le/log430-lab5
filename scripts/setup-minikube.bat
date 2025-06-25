@echo off
echo ============================================
echo Building Docker images in Minikube
echo ============================================

echo Checking if Minikube is running...
minikube status
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Minikube is not running. Please start Minikube first with:
    echo minikube start --driver=docker
    echo.
    echo Or run the fix-minikube.bat script.
    goto :EOF
)

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