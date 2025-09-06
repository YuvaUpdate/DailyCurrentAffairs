@echo off
echo ======================================
echo YuvaUpdate Admin User Setup
echo ======================================
echo.
echo This script will create an admin user in your Firebase project
echo Project: yuvaupdate-3762b
echo Admin Email: admin@yuvaupdate.com
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Installing required Firebase packages...
call npm install firebase --save-dev

echo.
echo Running admin setup script...
echo.
node setup-admin.js

echo.
echo Setup completed! Press any key to exit...
pause >nul
