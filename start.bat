@echo off
echo =====================================================================
echo  HydroCast AI - Launching Full Dual-Engine System
echo =====================================================================
echo.
echo [1/2] Launching Python FastAPI Backend (Port 8000)...
start "HydroCast AI - Backend Service (Port 8000)" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching React Vite Frontend (Port 5173)...
start "HydroCast AI - Frontend Dashboard (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo  Both services launched in separate windows!
echo  - Backend API: http://127.0.0.1:8000/docs
echo  - Dashboard:   http://localhost:5173
echo =====================================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
