#!/bin/bash

echo "========================================"
echo "  LinkSnip - URL Shortener"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker tidak terinstall!"
    echo "Silakan install Docker dari: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "[ERROR] Docker Compose tidak terinstall!"
    exit 1
fi

echo "[INFO] Starting LinkSnip..."
echo ""

# Start Docker Compose
docker-compose up -d

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Gagal menjalankan aplikasi!"
    echo "Coba jalankan: docker-compose logs"
    exit 1
fi

echo ""
echo "========================================"
echo "  LinkSnip berhasil dijalankan!"
echo "========================================"
echo ""
echo "Tunggu 30 detik untuk semua service siap..."
sleep 30

echo ""
echo "Aplikasi tersedia di:"
echo "  - Frontend:  http://localhost"
echo "  - Backend:   http://localhost:3000"
echo "  - Dashboard: http://localhost/dashboard"
echo ""
echo "Login Dashboard:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Untuk melihat logs: docker-compose logs -f"
echo "Untuk stop: docker-compose down"
echo ""
