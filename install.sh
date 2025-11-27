#!/bin/bash

# LinkSnip Quick Install Script
# This script will install Docker and deploy LinkSnip on your VPS

set -e

echo "=================================="
echo "  LinkSnip Quick Install Script"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    echo "Usage: sudo bash install.sh"
    exit 1
fi

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Cannot detect OS"
    exit 1
fi

echo "✓ Detected OS: $OS"
echo ""

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✓ Docker installed"
else
    echo "✓ Docker already installed"
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker Compose available"
echo ""

# Clone repository
echo "📥 Cloning LinkSnip repository..."
if [ -d "linksnip" ]; then
    echo "⚠️  Directory 'linksnip' already exists"
    read -p "Remove and re-clone? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf linksnip
    else
        echo "❌ Installation cancelled"
        exit 1
    fi
fi

git clone https://github.com/ridzwandanis/linksnip.git
cd linksnip

echo "✓ Repository cloned"
echo ""

# Configure environment
echo "⚙️  Configuration"
echo "=================="
echo ""

if [ -f .env ]; then
    echo "⚠️  .env file already exists"
    read -p "Overwrite? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing .env file"
    else
        cp .env.production.example .env
    fi
else
    cp .env.production.example .env
fi

# Prompt for configuration
read -p "Enter your domain (or press Enter for http://localhost): " DOMAIN
DOMAIN=${DOMAIN:-http://localhost}

read -p "Enter admin username (default: admin): " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -sp "Enter admin password (default: admin123): " ADMIN_PASS
echo ""
ADMIN_PASS=${ADMIN_PASS:-admin123}

# Update .env file
sed -i "s|BASE_URL=.*|BASE_URL=$DOMAIN|g" .env
sed -i "s|ADMIN_USERNAME=.*|ADMIN_USERNAME=$ADMIN_USER|g" .env
sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ADMIN_PASS|g" .env

echo ""
echo "✓ Configuration saved to .env"
echo ""

# Start services
echo "🚀 Starting LinkSnip..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "=================================="
echo "  ✅ Installation Complete!"
echo "=================================="
echo ""
echo "🌐 Access your LinkSnip instance:"
echo "   Frontend: $DOMAIN"
echo "   Backend:  $DOMAIN:3000"
echo "   Dashboard: $DOMAIN/dashboard"
echo ""
echo "🔐 Admin Credentials:"
echo "   Username: $ADMIN_USER"
echo "   Password: $ADMIN_PASS"
echo ""
echo "📝 Next Steps:"
echo "   1. Configure your domain DNS to point to this server"
echo "   2. Setup SSL certificate (see docs/VPS_DEPLOYMENT.md)"
echo "   3. Change admin password in .env file"
echo ""
echo "📚 Documentation:"
echo "   - Full guide: docs/VPS_DEPLOYMENT.md"
echo "   - API docs: docs/API.md"
echo ""
echo "🔧 Useful Commands:"
echo "   - View logs: docker compose logs -f"
echo "   - Restart: docker compose restart"
echo "   - Stop: docker compose down"
echo ""
