# 🚀 VPS Deployment Guide

Complete guide to deploy LinkSnip on your VPS (Ubuntu/Debian).

## Prerequisites

- VPS with Ubuntu 20.04+ or Debian 11+
- Minimum 1GB RAM, 1 CPU core
- Domain name (optional but recommended)
- SSH access to your VPS

## Step 1: Initial Server Setup

### 1.1 Connect to Your VPS

```bash
ssh root@your-server-ip
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify installation
docker --version
docker compose version
```

### 1.4 (Optional) Create Non-Root User

```bash
# Create user
adduser linksnip
usermod -aG sudo linksnip
usermod -aG docker linksnip

# Switch to new user
su - linksnip
```

## Step 2: Deploy LinkSnip

### 2.1 Clone Repository

```bash
cd ~
git clone https://github.com/ridzwandanis/linksnip.git
cd linksnip
```

### 2.2 Configure Environment

```bash
# Copy example env file
cp .env.production.example .env

# Edit configuration
nano .env
```

**Important settings to change:**

```env
# Your domain (or server IP)
BASE_URL=https://yourdomain.com

# Strong admin password
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password-here

# Other settings (optional)
RATE_LIMIT_MAX_REQUESTS=10
ANALYTICS_RETENTION_DAYS=90
```

Save and exit (Ctrl+X, Y, Enter)

### 2.3 Start Services

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

**Expected output:**

```
✓ Container linksnip-mongodb   Started
✓ Container linksnip-backend   Started
✓ Container linksnip-frontend  Started
```

### 2.4 Verify Deployment

```bash
# Test backend
curl http://localhost:3000/health

# Test frontend
curl http://localhost
```

## Step 3: Domain & SSL Setup

### Option A: Using Nginx + Let's Encrypt (Recommended)

#### 3.1 Install Nginx

```bash
sudo apt install nginx -y
```

#### 3.2 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/linksnip
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/linksnip /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3.3 Install SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts and choose redirect HTTP to HTTPS
```

**Auto-renewal is configured automatically!**

### Option B: Using Caddy (Easier)

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Configure Caddy
sudo nano /etc/caddy/Caddyfile
```

**Paste this:**

```caddy
yourdomain.com {
    reverse_proxy localhost:80
}
```

**Start Caddy:**

```bash
sudo systemctl restart caddy
```

**Caddy automatically handles SSL!**

## Step 4: Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

## Step 5: Monitoring & Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongodb
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Update Application

```bash
cd ~/linksnip

# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build
```

### Backup Database

```bash
# Create backup
docker compose exec mongodb mongodump --out=/data/backup

# Copy backup to host
docker cp linksnip-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)

# Compress
tar -czf mongodb-backup-$(date +%Y%m%d).tar.gz mongodb-backup-$(date +%Y%m%d)
```

### Restore Database

```bash
# Copy backup to container
docker cp mongodb-backup-20250127 linksnip-mongodb:/data/restore

# Restore
docker compose exec mongodb mongorestore /data/restore
```

## Step 6: Performance Optimization

### Enable Nginx Caching

Add to Nginx config:

```nginx
# Cache zone
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=linksnip_cache:10m max_size=100m inactive=60m;

server {
    # ... existing config ...

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:80;
        proxy_cache linksnip_cache;
        proxy_cache_valid 200 1d;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

### MongoDB Optimization

```bash
# Connect to MongoDB
docker compose exec mongodb mongosh url-shortener

# Create indexes (if not exists)
db.urls.createIndex({ "shortCode": 1 }, { unique: true })
db.clicks.createIndex({ "shortCode": 1, "timestamp": -1 })
db.clicks.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 7776000 })
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Clean up Docker
docker system prune -a
```

### Can't Access Application

```bash
# Check if services are running
docker compose ps

# Check ports
sudo netstat -tulpn | grep -E '80|3000|27017'

# Check firewall
sudo ufw status
```

### Database Connection Error

```bash
# Check MongoDB logs
docker compose logs mongodb

# Restart MongoDB
docker compose restart mongodb
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart services
docker compose restart
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Using HTTPS (SSL certificate)
- [ ] Firewall configured
- [ ] Regular backups scheduled
- [ ] MongoDB not exposed to public
- [ ] Strong passwords used
- [ ] Server updated regularly
- [ ] Monitoring setup

## Production Checklist

- [ ] Domain configured with DNS
- [ ] SSL certificate installed
- [ ] Environment variables set correctly
- [ ] Firewall rules configured
- [ ] Backup strategy in place
- [ ] Monitoring setup
- [ ] Log rotation configured
- [ ] Rate limiting tested
- [ ] Admin password changed
- [ ] Application tested end-to-end

## Support

- **Documentation**: [README.md](../README.md)
- **Issues**: [GitHub Issues](https://github.com/ridzwandanis/linksnip/issues)
- **Security**: [SECURITY.md](../SECURITY.md)

---

**Congratulations!** 🎉 Your LinkSnip instance is now running in production!

Access your application at: `https://yourdomain.com`
