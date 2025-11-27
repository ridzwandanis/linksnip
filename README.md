# LinkSnip - URL Shortener

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Docker Hub](https://img.shields.io/badge/Docker%20Hub-Images-blue.svg)](https://hub.docker.com/u/ridzwandanis)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)

A minimalist, self-hosted URL shortening service with analytics dashboard built with Node.js, React, and MongoDB.

## 📸 Screenshots

<div align="center">

### Main Interface

![LinkSnip Main Interface](https://cdn.clariosolution.co/demo1.png)

### Analytics Dashboard

![Analytics Dashboard](https://cdn.clariosolution.co/demo2.png)

### URL Management

![URL Management](https://cdn.clariosolution.co/demo3.png)

</div>

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

## 🚀 Quick Start

### Option 1: One-Line Install (VPS/Server)

Deploy to your VPS in one command:

```bash
curl -fsSL https://raw.githubusercontent.com/ridzwandanis/linksnip/main/install.sh | sudo bash
```

This will:

- ✅ Install Docker automatically
- ✅ Clone the repository
- ✅ Configure environment
- ✅ Start all services
- ✅ Ready in 2 minutes!

**📖 Complete VPS Guide:** See [docs/VPS_DEPLOYMENT.md](docs/VPS_DEPLOYMENT.md) for manual installation, domain setup, and SSL configuration.

### Option 2: Manual VPS Deployment

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Clone and configure
git clone https://github.com/ridzwandanis/linksnip.git
cd linksnip
cp .env.production.example .env
nano .env  # Edit BASE_URL and ADMIN_PASSWORD

# 3. Start services
docker compose up -d
```

### Option 3: Local Development

```bash
git clone https://github.com/ridzwandanis/linksnip.git
cd linksnip
docker compose up -d
```

### Option 4: Docker Hub (Pre-built Images)

```bash
curl -O https://raw.githubusercontent.com/ridzwandanis/linksnip/main/docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d
```

**Access the application:**

- **Frontend**: http://localhost (or your domain)
- **Backend API**: http://localhost:3000
- **Dashboard**: http://localhost/dashboard
- **Default Login**: admin / admin123

⚠️ **Security**: Change admin password in `.env` before production deployment!

## 📖 Documentation

For detailed guides, see the [docs](docs/) folder:

| Document                                             | Description                              |
| ---------------------------------------------------- | ---------------------------------------- |
| [API Reference](docs/API.md)                         | Complete API documentation with examples |
| [Architecture](docs/ARCHITECTURE.md)                 | System design and technical architecture |
| [Local Development](docs/LOCAL_DEVELOPMENT.md)       | Development environment setup            |
| [Quick Start](docs/QUICK_START.md)                   | VPS deployment guide                     |
| [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) | Production deployment checklist          |

## ⚙️ Configuration

### Environment Variables

**Backend** (`backend/.env`):

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/url-shortener
BASE_URL=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

**Frontend** (`frontend/.env`):

```env
VITE_API_BASE_URL=http://localhost:3000
```

See `.env.example` files for complete configuration options.

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build
```

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
