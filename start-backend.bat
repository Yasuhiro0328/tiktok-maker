@echo off
echo ====================================
echo  Starting Backend
echo ====================================

cd /d %~dp0backend

if not exist venv (
    echo [1/3] Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Python not found.
        echo Install from: https://www.python.org/downloads/
        pause
        exit /b 1
    )
    call venv\Scripts\activate
    echo [2/3] Installing packages...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Package installation failed.
        pause
        exit /b 1
    )
) else (
    call venv\Scripts\activate
    echo [skipped] venv already exists. Run with --reinstall to force reinstall.
)

echo [3/3] Starting server at http://localhost:8000
echo.
echo Press Ctrl+C to stop.
echo.
python -m uvicorn main:app --reload --port 8000

pause
