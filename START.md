# 🚀 Cara Menjalankan LinkSnip

## Metode 1: Docker (Recommended) ⭐

Cara tercepat dan termudah untuk menjalankan seluruh aplikasi.

### Langkah-langkah:

1. **Pastikan Docker sudah terinstall**

   ```bash
   docker --version
   docker-compose --version
   ```

2. **Jalankan aplikasi**

   ```bash
   docker-compose up -d
   ```

3. **Tunggu hingga semua service siap** (sekitar 1-2 menit)

   ```bash
   docker-compose logs -f
   ```

   Tekan `Ctrl+C` untuk keluar dari logs

4. **Akses aplikasi**
   - Frontend: http://localhost
   - Backend API: http://localhost:3000
   - Dashboard Analytics: http://localhost/dashboard
     - Username: `admin`
     - Password: `admin123`

### Perintah Docker Berguna:

```bash
# Lihat status services
docker-compose ps

# Lihat logs semua services
docker-compose logs -f

# Lihat logs service tertentu
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Restart service tertentu
docker-compose restart backend

# Stop semua services
docker-compose down

# Stop dan hapus semua data (termasuk database)
docker-compose down -v

# Rebuild dan restart
docker-compose up -d --build
```

### Troubleshooting Docker:

**Port sudah digunakan:**

```bash
# Cek port yang digunakan
netstat -ano | findstr :80
netstat -ano | findstr :3000
netstat -ano | findstr :27017

# Ubah port di docker-compose.yml jika perlu
```

**Service tidak bisa connect:**

```bash
# Restart semua services
docker-compose restart

# Atau rebuild dari awal
docker-compose down
docker-compose up -d --build
```

---

## Metode 2: Manual Development

Untuk development atau jika tidak menggunakan Docker.

### Prerequisites:

- Node.js 18+
- MongoDB 6.0+
- npm

### 1. Setup MongoDB

**Windows:**

```bash
# Install MongoDB atau jalankan via Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

**Linux/Mac:**

```bash
# Install MongoDB atau jalankan via Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/url-shortener
BASE_URL=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

Jalankan backend:

```bash
npm run dev
```

### 3. Setup Frontend

Buka terminal baru:

```bash
cd frontend
npm install
```

Edit `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Jalankan frontend:

```bash
npm run dev
```

### 4. Akses Aplikasi

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Dashboard: http://localhost:8080/dashboard

---

## 🔐 Default Credentials

**Analytics Dashboard:**

- Username: `admin`
- Password: `admin123`

⚠️ **PENTING**: Ubah password sebelum deploy ke production!

---

## 📝 Testing API

### Shorten URL:

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://google.com\"}"
```

### Custom Short Code:

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://google.com\",\"customCode\":\"google\"}"
```

### Get Analytics:

```bash
curl -u admin:admin123 http://localhost:3000/api/analytics/system
```

---

## 🐛 Common Issues

### 1. Port 80 sudah digunakan (Windows)

```bash
# Stop IIS atau service lain yang menggunakan port 80
net stop http

# Atau ubah port di docker-compose.yml:
# ports:
#   - '8080:80'  # Akses via http://localhost:8080
```

### 2. MongoDB connection error

```bash
# Pastikan MongoDB running
docker-compose ps

# Restart MongoDB
docker-compose restart mongodb
```

### 3. Frontend tidak bisa connect ke backend

- Pastikan `VITE_API_BASE_URL` di `.env` benar
- Cek backend sudah running: http://localhost:3000/api/health

### 4. Build error di frontend

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📦 Production Deployment

1. Update `docker-compose.yml`:

   - Ubah `ADMIN_PASSWORD`
   - Ubah `BASE_URL` ke domain production
   - Tambahkan volume untuk logs

2. Build dan jalankan:

   ```bash
   docker-compose up -d --build
   ```

3. Setup reverse proxy (Nginx/Caddy) untuk HTTPS

4. Setup backup untuk MongoDB:
   ```bash
   docker-compose exec mongodb mongodump --out /backup
   ```

---

## 📚 Dokumentasi Lengkap

Lihat `README.md` untuk dokumentasi lengkap tentang:

- API endpoints
- Environment variables
- Project structure
- Development guide
