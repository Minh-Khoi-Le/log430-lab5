@echo off
REM Main Quick Start Script for LOG430 Lab 5
REM Deployment Type Selector

:menu
cls
echo ========================================
echo   LOG430 Lab 5 - Quick Start Menu
echo   Load Balanced Microservices System
echo ========================================
echo.
echo Please choose your deployment method:
echo.
echo   1. Docker Compose Deployment
echo      - Fast setup and development
echo      - Uses Docker Compose files
echo      - Good for local development
echo.
echo   2. Kubernetes Deployment
echo      - Production-like environment
echo      - Uses Minikube locally
echo      - Advanced orchestration features
echo.
echo   3. Complete System Startup (Docker)
echo      - One-click Docker deployment
echo      - Starts everything automatically
echo.
echo   4. Complete System Startup (Kubernetes)
echo      - One-click Kubernetes deployment
echo      - Deploys everything to K8s
echo.
echo   5. View System Architecture
echo   6. Read Documentation
echo.
echo   0. Exit
echo.
echo ========================================

set /p choice=Please select option (0-6): 

if "%choice%"=="1" goto docker_deployment
if "%choice%"=="2" goto kubernetes_deployment
if "%choice%"=="3" goto complete_docker
if "%choice%"=="4" goto complete_kubernetes
if "%choice%"=="5" goto view_architecture
if "%choice%"=="6" goto documentation
if "%choice%"=="0" goto exit_script

echo Invalid choice. Please try again.
timeout /t 2 /nobreak >nul
goto menu

:docker_deployment
cls
echo ========================================
echo   Starting Docker Quick Start
echo ========================================
echo.
echo Launching Docker Compose environment...
echo This will open the Docker-specific menu.
echo.
pause
cd /d "%~dp0docker"
call quick-start-docker.bat
goto menu

:kubernetes_deployment
cls
echo ========================================
echo   Starting Kubernetes Quick Start
echo ========================================
echo.
echo Launching Kubernetes environment...
echo This will open the Kubernetes-specific menu.
echo.
echo Note: Requires Minikube and kubectl to be installed.
pause
cd /d "%~dp0kubernetes"
call quick-start-k8s.bat
goto menu

:complete_docker
cls
echo ========================================
echo   Complete Docker System Startup
echo ========================================
echo.
echo This will automatically start the entire system using Docker.
echo Perfect for quick demos or when you want everything running fast.
echo.
pause
cd /d "%~dp0.."
call start-complete-system.bat
goto menu

:complete_kubernetes
cls
echo ========================================
echo   Complete Kubernetes System Startup
echo ========================================
echo.
echo This will automatically deploy the entire system to Kubernetes.
echo Perfect for production-like testing or demonstrations.
echo.
echo Note: This will setup Minikube if needed.
pause
cd /d "%~dp0.."
call start-complete-k8s-system.bat
goto menu

:view_architecture
cls
echo ========================================
echo   System Architecture
echo ========================================
echo Opening architecture documentation...
start "" "%~dp0..\docs\Rapport d'architecture.md"
pause
goto menu

:documentation
cls
echo ========================================
echo   Documentation
echo ========================================
echo Available documentation:
echo.
echo   1. System Architecture Report
echo   2. Docker Deployment Guide
echo   3. Kubernetes Deployment Guide
echo   4. API Documentation
echo   5. Troubleshooting Guide
echo.
echo   0. Back to main menu
echo.
set /p doc_choice=Select documentation (0-5): 

if "%doc_choice%"=="1" start "" "%~dp0..\docs\Rapport d'architecture.md"
if "%doc_choice%"=="2" start "" "%~dp0docker\README.md"
if "%doc_choice%"=="3" start "" "%~dp0..\k8s\README.md"
if "%doc_choice%"=="4" echo API endpoints available at http://localhost:8000 when system is running
if "%doc_choice%"=="5" start "" "%~dp0README.md"
if "%doc_choice%"=="0" goto menu

timeout /t 3 /nobreak >nul
goto menu

:exit_script
cls
echo ========================================
echo   Thank you for using LOG430 Lab 5!
echo ========================================
echo.
echo Quick Start Options:
echo - Docker: scripts\docker\quick-start-docker.bat
echo - Kubernetes: scripts\kubernetes\quick-start-k8s.bat
echo - Complete Docker: start-complete-system.bat
echo - Complete Kubernetes: start-complete-k8s-system.bat
echo.
echo For support, check the README files in each directory.
echo.
timeout /t 3 /nobreak >nul
exit /b 0
