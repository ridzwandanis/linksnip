# Docker Hub Images

LinkSnip provides pre-built Docker images on Docker Hub for easy deployment.

## Available Images

### Backend API

```
ridzwandanis/linksnip-backend:latest
```

### Frontend

```
ridzwandanis/linksnip-frontend:latest
```

## Quick Start

### 1. Using docker-compose (Recommended)

```bash
# Download the production docker-compose file
curl -O https://raw.githubusercontent.com/ridzwandanis/linksnip/main/docker-compose.prod.yml

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Manual Docker Run

**Start MongoDB:**

```bash
docker run -d \
  --name linksnip-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=url-shortener \
  -v mongodb-data:/data/db \
  mongo:6.0
```

**Start Backend:**

```bash
docker run -d \
  --name linksnip-backend \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://mongodb:27017/url-shortener \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=admin123 \
  --link linksnip-mongodb:mongodb \
  ridzwandanis/linksnip-backend:latest
```

**Start Frontend:**

```bash
docker run -d \
  --name linksnip-frontend \
  -p 80:80 \
  --link linksnip-backend:backend \
  ridzwandanis/linksnip-frontend:latest
```

## Image Tags

- `latest` - Latest stable release from main branch
- `v1.0.0` - Specific version (semantic versioning)
- `main` - Latest commit from main branch

## Environment Variables

### Backend

| Variable                  | Default          | Description                          |
| ------------------------- | ---------------- | ------------------------------------ |
| `NODE_ENV`                | production       | Environment mode                     |
| `PORT`                    | 3000             | Server port                          |
| `MONGODB_URI`             | -                | MongoDB connection string (required) |
| `BASE_URL`                | http://localhost | Base URL for short links             |
| `ADMIN_USERNAME`          | admin            | Admin username                       |
| `ADMIN_PASSWORD`          | admin123         | Admin password (change this!)        |
| `RATE_LIMIT_ENABLED`      | true             | Enable rate limiting                 |
| `RATE_LIMIT_MAX_REQUESTS` | 10               | Max requests per minute              |

### Frontend

Frontend is pre-built with default API URL. For custom API URL, build from source.

## Updating Images

Pull the latest images:

```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Image Sizes

- **Backend**: ~150MB (Node.js Alpine + dependencies)
- **Frontend**: ~50MB (Nginx Alpine + built React app)
- **Total**: ~200MB (excluding MongoDB)

## Building Custom Images

If you need to customize the images:

```bash
# Clone repository
git clone https://github.com/ridzwandanis/linksnip.git
cd linksnip

# Build images
docker-compose build

# Or build individually
docker build -t my-linksnip-backend ./backend
docker build -t my-linksnip-frontend ./frontend
```

## Automated Builds

Images are automatically built and pushed to Docker Hub when:

- New commits are pushed to main branch
- New releases are created
- New version tags are pushed

See [.github/workflows/docker-publish.yml](../.github/workflows/docker-publish.yml) for details.

## Support

For issues related to Docker images:

- Check [GitHub Issues](https://github.com/ridzwandanis/linksnip/issues)
- Review [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- See [Architecture Documentation](ARCHITECTURE.md)
