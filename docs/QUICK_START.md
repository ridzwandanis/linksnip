# 🚀 Quick Start - Deploy ke VPS

Panduan cepat deploy LinkSnip ke VPS (Ubuntu/Debian).

## Prerequisites

- VPS dengan Ubuntu 20.04+ atau Debian 11+
- Domain (opsional, bisa pakai IP)
- SSH access ke VPS

---

## Langkah 1: Koneksi ke VPS

```bash
ssh root@your-vps-ip
# atau
ssh username@your-vps-ip
```

---

## Langkah 2: Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verifikasi instalasi
docker --version
docker compose version

# (Opsional) Tambahkan user ke docker group
sudo usermod -aG docker $USER
newgrp docker
```

---

## Langkah 3: Clone Repository

```bash
# Install git jika belum ada
sudo apt install git -y

# Clone repository
git clone <YOUR_REPO_URL>
cd <YOUR_PROJECT_NAME>
```

---

## Langkah 4: Konfigurasi Environment

Edit `docker-compose.yml` dan ubah:

```bash
nano docker-compose.yml
```

**Penting! Ubah nilai berikut:**

```yaml
backend:
  environment:
    - BASE_URL=http://your-domain.com # Atau http://your-vps-ip
    - ADMIN_USERNAME=admin
    - ADMIN_PASSWORD=GANTI_PASSWORD_INI # ⚠️ WAJIB GANTI!
```

Simpan dengan `Ctrl+X`, `Y`, `Enter`

---

## Langkah 5: Jalankan Aplikasi

```bash
# Build dan jalankan semua services
docker compose up -d --build

# Tunggu 1-2 menit, lalu cek status
docker compose ps
```

Output yang benar:

```
NAME                  STATUS
linksnip-backend      Up (healthy)
linksnip-frontend     Up (healthy)
linksnip-mongodb      Up (healthy)
```

---

## Langkah 6: Akses Aplikasi

### Jika menggunakan IP:

- Frontend: `http://your-vps-ip`
- Dashboard: `http://your-vps-ip/dashboard`
- API: `http://your-vps-ip:3000`

### Jika menggunakan domain:

Lanjut ke **Langkah 7** untuk setup domain + HTTPS

---

## Langkah 7: Setup Domain & HTTPS (Opsional tapi Recommended)

### 7.1 Point Domain ke VPS

Di DNS provider (Cloudflare, Namecheap, dll):

```
A Record: @ -> your-vps-ip
A Record: www -> your-vps-ip
```

### 7.2 Install Nginx & Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 7.3 Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/linksnip
```

Paste konfigurasi ini (ganti `your-domain.com`):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/linksnip /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7.4 Install SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Ikuti instruksi, pilih redirect HTTP ke HTTPS.

### 7.5 Update BASE_URL

```bash
nano docker-compose.yml
```

Ubah:

```yaml
- BASE_URL=https://your-domain.com
```

Restart:

```bash
docker compose restart backend
```

---

## ✅ Verifikasi

### Cek Services:

```bash
docker compose ps
docker compose logs -f
```

### Test API:

```bash
curl http://localhost:3000/api/health
```

### Test Shorten URL:

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://google.com"}'
```

---

## 🔧 Perintah Berguna

```bash
# Lihat logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Restart services
docker compose restart
docker compose restart backend

# Stop aplikasi
docker compose down

# Update aplikasi (setelah git pull)
git pull
docker compose up -d --build

# Backup database
docker compose exec mongodb mongodump --out /backup
docker cp linksnip-mongodb:/backup ./mongodb-backup

# Restore database
docker cp ./mongodb-backup linksnip-mongodb:/backup
docker compose exec mongodb mongorestore /backup
```

---

## 🔐 Keamanan

### 1. Firewall

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 2. Ubah Password Admin

Edit `docker-compose.yml`:

```yaml
- ADMIN_PASSWORD=password-yang-kuat-dan-unik
```

Restart:

```bash
docker compose restart backend
```

### 3. Disable MongoDB Port (Opsional)

Edit `docker-compose.yml`, hapus/comment:

```yaml
mongodb:
  # ports:
  #   - '27017:27017'  # Disable akses dari luar
```

---

## 🔄 Auto-Start on Boot

```bash
# Enable Docker service
sudo systemctl enable docker

# Services akan auto-start karena restart: unless-stopped
```

---

## 📊 Monitoring

### Cek Resource Usage:

```bash
docker stats
```

### Cek Disk Space:

```bash
df -h
docker system df
```

### Clean Up:

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

---

## 🐛 Troubleshooting

### Port sudah digunakan:

```bash
# Cek port yang digunakan
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000

# Kill process jika perlu
sudo kill -9 <PID>
```

### Service tidak healthy:

```bash
# Cek logs detail
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb

# Restart
docker compose restart
```

### Out of memory:

```bash
# Cek memory
free -h

# Add swap jika perlu
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📚 Next Steps

1. ✅ Deploy aplikasi
2. 🌐 Setup domain & HTTPS
3. 🔐 Ubah password admin
4. 🔥 Setup firewall
5. 💾 Setup backup otomatis
6. 📊 Setup monitoring (optional)

---

## 💡 Tips Production

- Gunakan domain dengan HTTPS (gratis via Let's Encrypt)
- Setup backup database rutin (cron job)
- Monitor disk space dan memory
- Update Docker images secara berkala
- Gunakan strong password untuk admin
- Consider menggunakan managed MongoDB (MongoDB Atlas) untuk production

---

## 📞 Support

Jika ada masalah, cek:

- `docker compose logs -f` untuk logs
- `docker compose ps` untuk status services
- File `START.md` untuk troubleshooting lengkap
