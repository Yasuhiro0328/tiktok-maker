@echo off
echo ====================================
echo  Starting Frontend
echo ====================================

cd /d %~dp0frontend

if not exist node_modules (
    echo [1/2] Installing packages...
    npm install
    if errorlevel 1 (
        echo ERROR: Node.js not found.
        echo Install from: https://nodejs.org/
        pause
        exit /b 1
    )
)

echo [2/2] Starting dev server...
echo.
echo Open http://localhost:5173 in Chrome
echo Press Ctrl+C to stop.
echo.
npm run dev

pause
