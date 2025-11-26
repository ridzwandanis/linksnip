# LinkSnip - URL Shortener

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)

A minimalist, self-hosted URL shortening service with analytics dashboard.

![LinkSnip Demo](https://via.placeholder.com/800x400?text=LinkSnip+Demo+Screenshot)

> **Note**: Replace the demo image above with an actual screenshot of your application

## Features

- 🔗 URL shortening with auto-generated or custom codes
- 📊 Analytics dashboard with click tracking
- 🔐 Admin authentication for analytics
- 🎨 Modern, responsive UI
- 🚀 Fast and lightweight
- 🐳 Docker support for easy deployment

## Tech Stack

**Frontend:**

- React + TypeScript
- Vite
- shadcn-ui
- Tailwind CSS
- TanStack Query
- Recharts

**Backend:**

- Node.js + Express
- MongoDB
- Winston (logging)

## Quick Start

### 🚀 Deploy ke VPS (Production)

Lihat panduan lengkap di **[docs/QUICK_START.md](docs/QUICK_START.md)**

```bash
# Di VPS Ubuntu/Debian
git clone https://github.com/ridzwandanis/linksnip.git
cd linksnip
docker compose up -d --build
```

### 💻 Local Development

Lihat panduan lengkap di **[docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md)**

**Docker (Recommended):**

```bash
docker-compose up -d
```

**Manual:**

```bash
# Terminal 1 - Backend
cd backend && npm install && npm run dev

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

### Default Admin Credentials

- Username: `admin`
- Password: `admin123`

⚠️ **Penting**: Ubah password admin di `docker-compose.yml` sebelum deploy ke production!

## Quick Start with Docker

Jalankan seluruh aplikasi (backend, frontend, database) dengan satu perintah:

```bash
docker-compose up -d
```

Aplikasi akan tersedia di:

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **MongoDB**: localhost:27017

### Default Admin Credentials

- Username: `admin`
- Password: `admin123`

⚠️ **Penting**: Ubah password admin di `docker-compose.yml` sebelum deploy ke production!

### Menghentikan Aplikasi

```bash
docker-compose down
```

### Menghapus Data (termasuk database)

```bash
docker-compose down -v
```

## Development Setup

### Prerequisites

- Node.js 18+ & npm
- MongoDB 6.0+

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env sesuai kebutuhan
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env sesuai kebutuhan
npm run dev
```

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/url-shortener
BASE_URL=http://localhost:3000
LOG_LEVEL=info
SHORT_CODE_LENGTH=6
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
ANALYTICS_RETENTION_DAYS=90
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:3000
```

## API Endpoints

### Public Endpoints

- `POST /api/shorten` - Shorten a URL
- `GET /:shortCode` - Redirect to original URL

### Protected Endpoints (require authentication)

- `GET /api/analytics/system` - Get system analytics
- `GET /api/analytics/popular` - Get popular URLs
- `DELETE /api/urls/:shortCode` - Delete a URL

## Project Structure

```
linksnip/
├── backend/              # Backend API
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── server.js
│   ├── Dockerfile
│   └── package.json
├── frontend/             # Frontend React app
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml    # Docker orchestration
└── README.md
```

## Docker Commands

### Build dan jalankan semua services

```bash
docker-compose up --build -d
```

### Lihat logs

```bash
# Semua services
docker-compose logs -f

# Service tertentu
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Restart service tertentu

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Akses MongoDB shell

```bash
docker-compose exec mongodb mongosh url-shortener
```

## Production Deployment

1. Clone repository
2. Update environment variables di `docker-compose.yml`:
   - Ubah `ADMIN_PASSWORD`
   - Ubah `BASE_URL` ke domain production
3. Jalankan: `docker-compose up -d`
4. Setup reverse proxy (Nginx/Caddy) untuk HTTPS
5. Setup backup untuk MongoDB volume

## Roadmap

- [ ] User authentication and personal dashboards
- [ ] QR code generation for short URLs
- [ ] Bulk URL shortening
- [ ] API rate limiting per user
- [ ] Custom domains support
- [ ] Link expiration dates
- [ ] Password-protected links
- [ ] Export analytics data (CSV/JSON)

## 📚 Documentation

- [API Documentation](docs/API.md) - Complete API reference
- [Architecture](docs/ARCHITECTURE.md) - System design and architecture
- [Quick Start Guide](docs/QUICK_START.md) - VPS deployment guide
- [Local Development](docs/LOCAL_DEVELOPMENT.md) - Development setup
- [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) - Production checklist
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Security Policy](SECURITY.md) - Security and vulnerability reporting

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

Please see our [Security Policy](SECURITY.md) for reporting vulnerabilities.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Express.js](https://expressjs.com/) and [React](https://react.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

## Support

If you find this project helpful, please give it a ⭐️ on GitHub!

For questions or issues, please [open an issue](https://github.com/ridzwandanis/linksnip/issues).
