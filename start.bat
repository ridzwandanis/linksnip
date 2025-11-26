@echo off
echo ========================================
echo   LinkSnip - URL Shortener
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker tidak terinstall!
    echo Silakan install Docker Desktop dari: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose tidak terinstall!
    pause
    exit /b 1
)

echo [INFO] Starting LinkSnip...
echo.

REM Start Docker Compose
docker-compose up -d

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Gagal menjalankan aplikasi!
    echo Coba jalankan: docker-compose logs
    pause
    exit /b 1
)

echo.
echo ========================================
echo   LinkSnip berhasil dijalankan!
echo ========================================
echo.
echo Tunggu 30 detik untuk semua service siap...
timeout /t 30 /nobreak >nul

echo.
echo Aplikasi tersedia di:
echo   - Frontend:  http://localhost
echo   - Backend:   http://localhost:3000
echo   - Dashboard: http://localhost/dashboard
echo.
echo Login Dashboard:
echo   Username: admin
echo   Password: admin123
echo.
echo Untuk melihat logs: docker-compose logs -f
echo Untuk stop: docker-compose down
echo.
pause
