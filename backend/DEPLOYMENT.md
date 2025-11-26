# Deployment Guide

This guide provides instructions for deploying the URL Shortener application using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- At least 512MB of available RAM
- At least 1GB of available disk space

## Environment Variables

The application requires the following environment variables:

### Server Configuration

- `NODE_ENV` - Application environment (development, staging, production)
  - Default: `production`
  - Required: Yes

- `PORT` - Port on which the server will listen
  - Default: `3000`
  - Required: Yes

### Database Configuration

- `MONGODB_URI` - MongoDB connection string
  - Format: `mongodb://host:port/database`
  - Example: `mongodb://mongodb:27017/url-shortener`
  - Required: Yes

### Application Configuration

- `BASE_URL` - Base URL for generating short URLs
  - Example: `http://localhost:3000` or `https://yourdomain.com`
  - Required: Yes

### Logging Configuration

- `LOG_LEVEL` - Logging level for application logs
  - Options: `error`, `warn`, `info`, `debug`
  - Default: `info`
  - Required: No

### Short Code Configuration

- `SHORT_CODE_LENGTH` - Length of generated short codes
  - Default: `6`
  - Range: 6-10 characters
  - Required: No

## Quick Start with Docker Compose

### 1. Clone the Repository

```bash
git clone <repository-url>
cd url-shortener
```

### 2. Configure Environment Variables

The `docker-compose.yml` file includes default environment variables. For production deployment, you should:

1. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

2. Edit the `.env` file with your production values:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/url-shortener
BASE_URL=https://yourdomain.com
LOG_LEVEL=info
SHORT_CODE_LENGTH=6
```

3. Update `docker-compose.yml` to use the `.env` file:

```yaml
services:
  app:
    env_file:
      - .env
```

### 3. Build and Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app
```

### 4. Verify Deployment

Check if the application is running:

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {"success":true,"data":{"status":"healthy","database":"connected","timestamp":"..."}}
```

### 5. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

## Deployment with Docker Only

If you prefer to use Docker without Docker Compose:

### 1. Create a Docker Network

```bash
docker network create url-shortener-network
```

### 2. Start MongoDB Container

```bash
docker run -d \
  --name url-shortener-mongodb \
  --network url-shortener-network \
  -p 27017:27017 \
  -v mongodb-data:/data/db \
  -e MONGO_INITDB_DATABASE=url-shortener \
  mongo:6.0
```

### 3. Build Application Image

```bash
docker build -t url-shortener:latest .
```

### 4. Run Application Container

```bash
docker run -d \
  --name url-shortener-app \
  --network url-shortener-network \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e MONGODB_URI=mongodb://url-shortener-mongodb:27017/url-shortener \
  -e BASE_URL=http://localhost:3000 \
  -e LOG_LEVEL=info \
  -e SHORT_CODE_LENGTH=6 \
  -v $(pwd)/logs:/app/logs \
  url-shortener:latest
```

## Production Deployment Considerations

### Security

1. **Use Environment Variables**: Never hardcode sensitive information in the code or Docker images.

2. **Network Isolation**: Use Docker networks to isolate services.

3. **MongoDB Authentication**: Enable authentication for MongoDB in production:

```yaml
mongodb:
  environment:
    - MONGO_INITDB_ROOT_USERNAME=admin
    - MONGO_INITDB_ROOT_PASSWORD=secure_password
```

Then update the connection string:

```
MONGODB_URI=mongodb://admin:secure_password@mongodb:27017/url-shortener?authSource=admin
```

4. **HTTPS**: Use a reverse proxy (nginx, Traefik) to handle SSL/TLS termination.

### Scaling

1. **Horizontal Scaling**: Run multiple application containers behind a load balancer:

```bash
docker-compose up -d --scale app=3
```

2. **MongoDB Replica Set**: For high availability, configure MongoDB as a replica set.

### Monitoring

1. **Health Checks**: The application provides a `/health` endpoint for monitoring.

2. **Logs**: Application logs are stored in the `./logs` directory and can be monitored:

```bash
# View application logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log
```

3. **Container Monitoring**: Use Docker stats to monitor resource usage:

```bash
docker stats url-shortener-app url-shortener-mongodb
```

### Backup and Recovery

1. **Database Backup**: Regularly backup MongoDB data:

```bash
# Create backup
docker exec url-shortener-mongodb mongodump --out /backup

# Copy backup from container
docker cp url-shortener-mongodb:/backup ./mongodb-backup
```

2. **Database Restore**: Restore from backup:

```bash
# Copy backup to container
docker cp ./mongodb-backup url-shortener-mongodb:/backup

# Restore backup
docker exec url-shortener-mongodb mongorestore /backup
```

## Troubleshooting

### Application Won't Start

**Problem**: Container exits immediately after starting.

**Solutions**:

1. Check logs: `docker-compose logs app`
2. Verify environment variables are set correctly
3. Ensure MongoDB is running: `docker-compose ps`
4. Check if port 3000 is already in use: `netstat -an | grep 3000`

### Cannot Connect to Database

**Problem**: Application logs show "MongoDB connection error".

**Solutions**:

1. Verify MongoDB container is running: `docker-compose ps mongodb`
2. Check MongoDB logs: `docker-compose logs mongodb`
3. Verify MONGODB_URI is correct in environment variables
4. Ensure containers are on the same network: `docker network inspect url-shortener-network`
5. Test MongoDB connection:

```bash
docker exec -it url-shortener-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Health Check Fails

**Problem**: `/health` endpoint returns unhealthy status.

**Solutions**:

1. Check application logs: `docker-compose logs app`
2. Verify database connection: `docker-compose logs mongodb`
3. Restart services: `docker-compose restart`
4. Check if database is accepting connections:

```bash
docker exec -it url-shortener-mongodb mongosh url-shortener --eval "db.stats()"
```

### Port Already in Use

**Problem**: Error "port is already allocated".

**Solutions**:

1. Check what's using the port: `netstat -an | grep 3000` (Linux/Mac) or `netstat -an | findstr 3000` (Windows)
2. Stop the conflicting service or change the port in `docker-compose.yml`:

```yaml
ports:
  - '3001:3000' # Map to different host port
```

### Out of Disk Space

**Problem**: Container fails with disk space errors.

**Solutions**:

1. Clean up unused Docker resources:

```bash
docker system prune -a
docker volume prune
```

2. Check disk usage: `docker system df`
3. Remove old images: `docker image prune -a`

### Data Loss After Restart

**Problem**: All URLs are lost after restarting containers.

**Solutions**:

1. Ensure volumes are configured in `docker-compose.yml`
2. Check if volumes exist: `docker volume ls`
3. Never use `docker-compose down -v` unless you want to delete data
4. Verify volume mounts: `docker inspect url-shortener-mongodb`

### Slow Performance

**Problem**: Application responds slowly.

**Solutions**:

1. Check resource usage: `docker stats`
2. Increase container resources in `docker-compose.yml`:

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
```

3. Check MongoDB indexes are created: Connect to MongoDB and run `db.urls.getIndexes()`
4. Monitor MongoDB performance: `docker exec -it url-shortener-mongodb mongosh --eval "db.currentOp()"`

### Container Keeps Restarting

**Problem**: Container enters restart loop.

**Solutions**:

1. Check logs for errors: `docker-compose logs --tail=100 app`
2. Verify all required environment variables are set
3. Check if MongoDB is ready before app starts (add healthcheck):

```yaml
app:
  depends_on:
    mongodb:
      condition: service_healthy
mongodb:
  healthcheck:
    test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
    interval: 10s
    timeout: 5s
    retries: 5
```

## Updating the Application

### Rolling Update

1. Pull latest code:

```bash
git pull origin main
```

2. Rebuild and restart:

```bash
docker-compose build app
docker-compose up -d app
```

### Zero-Downtime Update

1. Scale up with new version:

```bash
docker-compose up -d --scale app=2 --no-recreate
```

2. Remove old containers:

```bash
docker-compose up -d --scale app=1
```

## Support

For additional help:

- Check application logs: `docker-compose logs app`
- Check MongoDB logs: `docker-compose logs mongodb`
- Review the main README.md for API documentation
- Check Docker documentation: https://docs.docker.com/

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Documentation](https://hub.docker.com/_/mongo)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
