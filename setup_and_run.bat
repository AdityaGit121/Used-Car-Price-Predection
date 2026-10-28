@echo off
setlocal enabledelayedexpansion

title CarValue — Used Car Market Value Prediction System Setup & Runner
echo =====================================================================
echo           CarValue: Used Car Market Value Prediction System
echo =====================================================================
echo.

:: 1. Check if Python is installed
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not added to your system PATH.
    echo Please install Python 3.10+ from https://www.python.org/ and check
    echo "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VER=%%i
echo Python detected: %PYTHON_VER%

:: 2. Create virtual environment if it doesn't exist
echo.
echo [2/6] Checking virtual environment (venv)...
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment in .\venv...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
) else (
    echo Existing virtual environment detected.
)

:: 3. Activate virtual environment
echo.
echo [3/6] Activating virtual environment...
call venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)

:: 4. Upgrade pip and install requirements
echo.
echo [4/6] Installing / verifying dependencies from requirements.txt...
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Encountered issues installing some packages. Retrying in verbose mode...
    pip install -r requirements.txt
)

:: 5. Check if production model artifacts exist; if not, run train.py
echo.
echo [5/6] Checking machine learning model artifacts...
if not exist "models\production\model.joblib" (
    echo No production model found at models\production\model.joblib.
    echo Launching automated model training and benchmarking pipeline...
    python train.py
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Model training encountered an error. Check logs above.
        pause
        exit /b 1
    )
    echo Model training and production candidate activation succeeded!
) else (
    echo Production model artifact verified.
)

:: 6. Launch FastAPI server with Uvicorn and open browser
echo.
echo [6/6] Launching FastAPI backend server on http://127.0.0.1:8000...
echo.
echo ---------------------------------------------------------------------
echo  App URL:   http://127.0.0.1:8000
echo  Admin URL: http://127.0.0.1:8000/admin (Default: admin / change-me-now)
echo ---------------------------------------------------------------------
echo.
echo Press CTRL+C in this terminal window to stop the server anytime.
echo.

:: Open default browser after a 2-second background delay
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000"

:: Start Uvicorn
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

pause
