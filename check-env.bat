@echo off
echo ====================================
echo  Environment Check
echo ====================================
echo.

set ALL_OK=1

echo [Python]
python --version 2>nul
if errorlevel 1 (
    echo   NG: Python not found
    echo   Install from: https://www.python.org/downloads/
    echo   Check "Add Python to PATH" during install
    set ALL_OK=0
) else (
    echo   OK
)
echo.

echo [Node.js]
node -v 2>nul
if errorlevel 1 (
    echo   NG: Node.js not found
    echo   Install from: https://nodejs.org/
    set ALL_OK=0
) else (
    echo   OK
)
echo.

echo [FFmpeg]
ffmpeg -version 2>nul | findstr "ffmpeg version"
if errorlevel 1 (
    echo   NG: FFmpeg not found
    echo   Make sure C:\ffmpeg\bin is in your PATH
    set ALL_OK=0
) else (
    echo   OK
)
echo.

echo ====================================
if "%ALL_OK%"=="1" (
    echo  All OK! Ready to start.
    echo.
    echo  Steps:
    echo    1. Double-click start-backend.bat
    echo    2. Double-click start-frontend.bat
    echo    3. Open http://localhost:5173 in Chrome
) else (
    echo  Please fix the NG items above.
)
echo ====================================
echo.
pause
