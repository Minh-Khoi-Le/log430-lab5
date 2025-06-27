@echo off
REM Frontend Startup Script for LOG430 Lab 5
REM This script starts the React frontend app in development mode

echo ========================================
echo   LOG430 Lab 5 - Frontend Startup
echo ========================================
echo.

echo Checking if Node.js is installed...
node --version > nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js is not installed or not in PATH!
  echo Please install Node.js and try again.
  exit /b 1
)
echo  Node.js is installed

echo.
echo Starting the frontend in development mode...
echo.

cd /d "%~dp0..\..\client"

echo Installing dependencies...
call npm install

echo.
echo Starting development server...
npm run dev

echo.
echo Frontend development server is starting...
echo You can access it at: http://localhost:5173 (or the URL shown above)
echo Press Ctrl+C to stop the server
echo.
