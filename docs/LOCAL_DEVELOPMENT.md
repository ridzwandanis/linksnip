# 💻 Local Development Guide

Panduan untuk menjalankan LinkSnip di komputer lokal untuk development.

---

## Metode 1: Docker (Recommended) ⭐

Cara tercepat untuk menjalankan seluruh stack.

### Prerequisites:

- Docker Desktop (Windows/Mac) atau Docker Engine (Linux)

### Windows:

1. **Install Docker Desktop**

   - Download: https://www.docker.com/products/docker-desktop
   - Install dan restart komputer
   - Buka Docker Desktop dan tunggu hingga running

2. **Jalankan aplikasi**

   ```bash
   # Double-click start.bat
   # atau
   docker-compose up -d
   ```

3. **Akses aplikasi**
   - Frontend: http://localhost
   - Dashboard: http://localhost/dashboard (admin/admin123)
   - Backend: http://localhost:3000

### Linux:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Jalankan aplikasi
docker compose up -d

# Atau gunakan script
chmod +x start.sh
./start.sh
```

### Mac:

```bash
# Install Docker Desktop
# Download dari: https://www.docker.com/products/docker-desktop

# Jalankan aplikasi
docker-compose up -d

# Atau gunakan script
chmod +x start.sh
./start.sh
```

### Perintah Docker Berguna:

```bash
# Lihat status
docker-compose ps

# Lihat logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart service
docker-compose restart backend

# Stop semua
docker-compose down

# Rebuild
docker-compose up -d --build

# Reset database
docker-compose down -v
docker-compose up -d
```

---

## Metode 2: Manual Development

Untuk development dengan hot-reload.

### Prerequisites:

- Node.js 18+
- MongoDB 6.0+
- npm

### 1. Setup MongoDB

**Opsi A: Docker (Recommended)**

```bash
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

**Opsi B: Install Manual**

- Windows: https://www.mongodb.com/try/download/community
- Linux: `sudo apt install mongodb`
- Mac: `brew install mongodb-community@6.0`

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
LOG_LEVEL=debug
SHORT_CODE_LENGTH=6
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ANALYTICS_RETENTION_DAYS=90
```

Jalankan:

```bash
npm run dev
```

Backend akan running di http://localhost:3000

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

Jalankan:

```bash
npm run dev
```

Frontend akan running di http://localhost:8080

### 4. Akses Aplikasi

- Frontend: http://localhost:8080
- Dashboard: http://localhost:8080/dashboard
- Backend API: http://localhost:3000

---

## Development Workflow

### Hot Reload

Kedua frontend dan backend support hot reload:

- Edit file di `backend/src/` → backend auto-restart
- Edit file di `frontend/src/` → frontend auto-reload

### Testing API

```bash
# Shorten URL
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://google.com\"}"

# Custom code
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://google.com\",\"customCode\":\"google\"}"

# Get analytics
curl -u admin:admin123 http://localhost:3000/api/analytics/system

# Get popular URLs
curl -u admin:admin123 http://localhost:3000/api/analytics/popular?limit=10

# Delete URL
curl -X DELETE -u admin:admin123 http://localhost:3000/api/urls/abc123
```

### Database Access

```bash
# Via Docker
docker exec -it mongodb mongosh url-shortener

# Via local MongoDB
mongosh url-shortener

# Common queries
db.urls.find().pretty()
db.urls.countDocuments()
db.clicks.find().limit(10).pretty()
```

---

## Project Structure

```
linksnip/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, logger config
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   ├── app.js           # Express app setup
│   │   └── server.js        # Entry point
│   ├── logs/                # Application logs
│   ├── .env                 # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/          # shadcn-ui components
│   │   │   ├── Header.tsx
│   │   │   ├── URLCard.tsx
│   │   │   └── StatsCard.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useUrls.ts
│   │   │   ├── useAnalytics.ts
│   │   │   └── use-toast.ts
│   │   ├── lib/             # Utilities
│   │   │   ├── errorHandler.ts
│   │   │   └── utils.ts
│   │   ├── pages/           # Page components
│   │   │   ├── Main.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Login.tsx
│   │   ├── services/        # API services
│   │   │   ├── urlService.ts
│   │   │   └── analyticsService.ts
│   │   ├── utils/           # Helper functions
│   │   │   └── validation.ts
│   │   ├── App.tsx          # Root component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   ├── .env                 # Environment variables
│   └── package.json
│
└── docker-compose.yml       # Docker orchestration
```

---

## Troubleshooting

### Port sudah digunakan

**Backend (3000):**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

**Frontend (8080):**

```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

### MongoDB connection error

```bash
# Cek MongoDB running
docker ps | grep mongodb

# Restart MongoDB
docker restart mongodb

# Atau start jika belum running
docker start mongodb
```

### Frontend tidak bisa connect ke backend

1. Cek backend running: http://localhost:3000/api/health
2. Cek `VITE_API_BASE_URL` di `frontend/.env`
3. Restart frontend: `npm run dev`

### Build error

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## Tips Development

1. **Use ESLint**: Jalankan `npm run lint` sebelum commit
2. **Check logs**: Backend logs ada di `backend/logs/`
3. **Use Postman**: Import `backend/postman_collection.json`
4. **Hot reload**: Kedua frontend dan backend support hot reload
5. **Debug**: Use VS Code debugger atau `console.log`

---

## Environment Variables

### Backend (.env)

```env
# Server
NODE_ENV=development          # development | production
PORT=3000                     # Server port

# Database
MONGODB_URI=mongodb://localhost:27017/url-shortener

# Application
BASE_URL=http://localhost:3000  # Base URL for short links
SHORT_CODE_LENGTH=6             # Length of generated codes

# Logging
LOG_LEVEL=debug                 # error | warn | info | debug

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000      # 1 minute
RATE_LIMIT_MAX_REQUESTS=100     # Max requests per window

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Analytics
ANALYTICS_RETENTION_DAYS=90     # Days to keep click data
```

### Frontend (.env)

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
```

---

## Next Steps

1. ✅ Setup development environment
2. 📝 Read API documentation
3. 🎨 Customize UI components
4. 🧪 Add tests (optional)
5. 🚀 Deploy to VPS (see QUICK_START.md)
