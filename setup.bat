@echo off
echo =====================================================================
echo  HydroCast AI - Full Environment Setup (Smart India Hackathon 2026)
echo =====================================================================
echo.

echo [1/2] Checking Python and installing backend dependencies...
python --version
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in system PATH!
    echo Please install Python 3.10+ from python.org and ensure "Add to PATH" is checked.
    pause
    exit /b 1
)

pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)
echo Python dependencies installed successfully.
echo.

echo [2/2] Checking Node.js and installing frontend dependencies...
node --version
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in system PATH!
    echo Please install Node.js 18+ from nodejs.org.
    pause
    exit /b 1
)

cd frontend
call npm install
cd ..
echo Frontend dependencies installed successfully.
echo.

echo =====================================================================
echo  Setup Complete! You can now run the system using: start.bat
echo =====================================================================
pause
