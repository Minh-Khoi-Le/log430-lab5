@echo off
echo =================================================
echo    LOG430 Lab 5 - Microservices Architecture
echo    Frontend Client Startup Guide
echo    ^(Load Balanced Configuration^)
echo =================================================
echo.

echo Before starting the frontend, make sure you have:
echo.
echo 1. Load Balanced API Gateway running on port 8000
echo    Run: cd api-gateway && start-gateway.bat
echo    ^(This now starts load balanced services by default^)
echo.
echo 2. All microservices running in load balanced mode:
echo    - Product Service: 2 instances ^(load balanced^)
echo    - Stock Service: 2 instances ^(load balanced^)
echo    - Cart Service: 2 instances ^(load balanced^)
echo    - User, Store, Sales, Refund Services: 1 instance each
echo.
echo 3. Database and Redis running
echo    ^(Started automatically with the gateway^)
echo.

echo Starting the frontend client...
echo.

cd /d "%~dp0..\..\client"
echo Installing dependencies...
call npm install

echo.
echo Starting development server on http://localhost:3000
echo The frontend will connect to API Gateway on http://localhost:8000/api
echo.

call npm run dev

pause
