@echo off
REM Kubernetes Quick Start Script for LOG430 Lab 5
REM Interactive menu for Kubernetes operations

:menu
cls
echo ========================================
echo   LOG430 Lab 5 - Kubernetes Quick Start
echo   Load Balanced Microservices System
echo ========================================
echo.
echo Setup & Deployment:
echo   1. Setup Minikube Environment
echo   2. Deploy Complete System
echo   3. Setup Port Forwarding
echo   4. Deploy Monitoring Only
echo.
echo Management:
echo   5. System Status Check
echo   6. View Pod Logs
echo   7. Restart Services
echo   8. Scale Services
echo.
echo Monitoring & Testing:
echo   9. Port Forward All Services
echo  10. Port Forward Monitoring Only
echo  11. Test System Health
echo.
echo Cleanup:
echo  12. Remove All Deployments
echo  13. Restart Minikube
echo  14. Complete Cleanup
echo.
echo Documentation:
echo  15. View System Architecture
echo  16. Kubernetes Documentation
echo.
echo  0. Exit
echo.
echo ========================================

set /p choice=Please select an option (0-16): 

if "%choice%"=="1" goto setup_minikube
if "%choice%"=="2" goto deploy_complete
if "%choice%"=="3" goto setup_port_forward
if "%choice%"=="4" goto deploy_monitoring
if "%choice%"=="5" goto system_status
if "%choice%"=="6" goto view_logs
if "%choice%"=="7" goto restart_services
if "%choice%"=="8" goto scale_services
if "%choice%"=="9" goto port_forward_all
if "%choice%"=="10" goto port_forward_monitoring
if "%choice%"=="11" goto test_health
if "%choice%"=="12" goto cleanup_deployments
if "%choice%"=="13" goto restart_minikube
if "%choice%"=="14" goto complete_cleanup
if "%choice%"=="15" goto view_architecture
if "%choice%"=="16" goto k8s_docs
if "%choice%"=="0" goto exit_script

echo Invalid choice. Please try again.
timeout /t 2 /nobreak >nul
goto menu

:setup_minikube
cls
echo ========================================
echo   Setting up Minikube Environment
echo ========================================
call setup-minikube.bat
echo.
echo Minikube setup complete!
pause
goto menu

:deploy_complete
cls
echo ========================================
echo   Deploying Complete System
echo ========================================
echo.
echo This will deploy:
echo [OK] All Microservices
echo [OK] API Gateway (Kong)
echo [OK] Database (PostgreSQL)
echo [OK] Cache (Redis)
echo [OK] Frontend Client
echo [OK] Monitoring (Prometheus + Grafana)
echo.
set /p confirm=Continue with deployment? (y/N): 
if /i not "%confirm%"=="y" goto menu

call deploy-k8s.bat
echo.
echo Deployment initiated! Use option 3 to setup port forwarding.
pause
goto menu

:setup_port_forward
cls
echo ========================================
echo   Setting up Port Forwarding
echo ========================================
echo.
echo This will forward ports for:
echo - Frontend: localhost:3000
echo - API Gateway: localhost:8000
echo - Grafana: localhost:3001
echo - Prometheus: localhost:9090
echo.
echo Note: This will run in background. Close terminal to stop.
set /p confirm=Continue? (y/N): 
if /i not "%confirm%"=="y" goto menu

start "Port Forwarding" cmd /k "call port-forward-all.bat"
echo.
echo Port forwarding started in new window!
pause
goto menu

:deploy_monitoring
cls
echo ========================================
echo   Deploying Monitoring Only
echo ========================================
echo Deploying Prometheus and Grafana...
kubectl apply -f "%~dp0..\..\k8s\monitoring.yaml"
echo.
echo Monitoring deployed!
pause
goto menu

:system_status
cls
echo ========================================
echo   System Status Check
echo ========================================
call system-status.bat
pause
goto menu

:view_logs
cls
echo ========================================
echo   View Pod Logs
echo ========================================
echo Available pods:
kubectl get pods
echo.
set /p podname=Enter pod name to view logs (or press Enter for all): 
if "%podname%"=="" (
    echo Showing logs for all pods...
    kubectl get pods -o name | findstr /r "pod/" > temp_pods.txt
    for /f "tokens=*" %%i in (temp_pods.txt) do (
        echo.
        echo === Logs for %%i ===
        kubectl logs %%i --tail=10
    )
    del temp_pods.txt
) else (
    kubectl logs %podname% --tail=50 -f
)
pause
goto menu

:restart_services
cls
echo ========================================
echo   Restart Services
echo ========================================
echo Which services to restart?
echo   1. All services
echo   2. Microservices only
echo   3. Specific service
echo   0. Back to menu
echo.
set /p restart_choice=Select option: 

if "%restart_choice%"=="1" (
    kubectl rollout restart deployment
    echo All services restarted!
) else if "%restart_choice%"=="2" (
    kubectl rollout restart deployment/product-service
    kubectl rollout restart deployment/cart-service
    kubectl rollout restart deployment/sales-service
    kubectl rollout restart deployment/refund-service
    kubectl rollout restart deployment/stock-service
    kubectl rollout restart deployment/store-service
    kubectl rollout restart deployment/user-service
    echo Microservices restarted!
) else if "%restart_choice%"=="3" (
    kubectl get deployments
    echo.
    set /p service_name=Enter deployment name: 
    kubectl rollout restart deployment/%service_name%
    echo Service %service_name% restarted!
) else if "%restart_choice%"=="0" (
    goto menu
)
pause
goto menu

:scale_services
cls
echo ========================================
echo   Scale Services
echo ========================================
kubectl get deployments
echo.
set /p service_name=Enter deployment name to scale: 
set /p replicas=Enter number of replicas: 
kubectl scale deployment/%service_name% --replicas=%replicas%
echo.
echo Service %service_name% scaled to %replicas% replicas!
pause
goto menu

:port_forward_all
cls
echo ========================================
echo   Port Forward All Services
echo ========================================
start "Port Forwarding" cmd /k "call port-forward-all.bat"
echo Port forwarding started in new window!
pause
goto menu

:port_forward_monitoring
cls
echo ========================================
echo   Port Forward Monitoring Only
echo ========================================
start "Monitoring Port Forward" cmd /k "call port-forward-monitoring.bat"
echo Monitoring port forwarding started in new window!
pause
goto menu

:test_health
cls
echo ========================================
echo   Test System Health
echo ========================================
echo Testing pod health...
kubectl get pods
echo.
echo Testing service connectivity...
kubectl get services
echo.
echo Checking ingress...
kubectl get ingress
echo.
echo Health check complete!
pause
goto menu

:cleanup_deployments
cls
echo ========================================
echo   Remove All Deployments
echo ========================================
echo WARNING: This will remove all deployed resources!
set /p confirm=Are you sure? (y/N): 
if /i not "%confirm%"=="y" goto menu

call cleanup-k8s.bat
echo.
echo All deployments removed!
pause
goto menu

:restart_minikube
cls
echo ========================================
echo   Restart Minikube
echo ========================================
echo WARNING: This will restart Minikube and remove all data!
set /p confirm=Are you sure? (y/N): 
if /i not "%confirm%"=="y" goto menu

echo Stopping Minikube...
minikube stop
echo Starting Minikube...
minikube start
echo.
echo Minikube restarted! You'll need to redeploy services.
pause
goto menu

:complete_cleanup
cls
echo ========================================
echo   Complete Cleanup
echo ========================================
echo WARNING: This will:
echo - Remove all deployments
echo - Delete Minikube cluster
echo - Clean up all resources
echo.
set /p confirm=Are you sure? (y/N): 
if /i not "%confirm%"=="y" goto menu

call cleanup-k8s.bat
minikube delete
echo.
echo Complete cleanup finished!
pause
goto menu

:view_architecture
cls
echo ========================================
echo   System Architecture
echo ========================================
echo Opening architecture documentation...
start "" "%~dp0..\..\docs\Rapport d'architecture.md"
pause
goto menu

:k8s_docs
cls
echo ========================================
echo   Kubernetes Documentation
echo ========================================
echo Opening Kubernetes documentation...
start "" "%~dp0..\..\k8s\README.md"
pause
goto menu

:exit_script
cls
echo Thank you for using the Kubernetes Quick Start script!
timeout /t 2 /nobreak >nul
exit /b 0
