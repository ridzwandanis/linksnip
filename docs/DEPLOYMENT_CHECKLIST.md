# Production Deployment Checklist

Use this checklist before deploying LinkSnip to production.

## Pre-Deployment

### Security

- [ ] Changed default admin username and password
- [ ] Used strong password (minimum 12 characters, mixed case, numbers, symbols)
- [ ] Configured HTTPS/SSL certificate
- [ ] Updated `BASE_URL` to production domain
- [ ] Reviewed and configured rate limiting settings
- [ ] Enabled MongoDB authentication
- [ ] Used strong MongoDB password
- [ ] Restricted MongoDB network access

### Configuration

- [ ] Created production `.env` file from `.env.production.example`
- [ ] Verified all environment variables are set correctly
- [ ] Updated `docker-compose.yml` for production settings
- [ ] Configured proper logging level (`warn` or `error`)
- [ ] Set up backup strategy for MongoDB

### Infrastructure

- [ ] Server meets minimum requirements (2GB RAM, 2 CPU cores)
- [ ] Docker and Docker Compose installed
- [ ] Firewall configured (allow ports 80, 443)
- [ ] Domain DNS configured correctly
- [ ] SSL certificate obtained (Let's Encrypt recommended)

## Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/ridzwandanis/linksnip.git
cd linksnip

# Create and configure .env files
cp .env.production.example backend/.env
cp .env.production.example frontend/.env
nano backend/.env  # Edit configuration
nano frontend/.env # Edit configuration

# Build and start services
docker compose up -d --build
```

### 3. Reverse Proxy Setup (Nginx)

```bash
# Install Nginx
sudo apt install nginx -y

# Configure Nginx (see QUICK_START.md for configuration)
sudo nano /etc/nginx/sites-available/linksnip

# Enable site
sudo ln -s /etc/nginx/sites-available/linksnip /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com
```

## Post-Deployment

### Verification

- [ ] Application accessible via HTTPS
- [ ] HTTP redirects to HTTPS
- [ ] Health check endpoint responding: `https://yourdomain.com/health`
- [ ] Can create short URLs
- [ ] Short URLs redirect correctly
- [ ] Analytics dashboard accessible with credentials
- [ ] Rate limiting working (test with multiple requests)

### Monitoring

- [ ] Set up log monitoring
- [ ] Configure backup automation
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Configure alerts for errors
- [ ] Monitor disk space usage

### Maintenance

- [ ] Document backup restoration procedure
- [ ] Schedule regular updates
- [ ] Plan for scaling if needed
- [ ] Set up monitoring dashboard

## Backup Strategy

### Database Backup

```bash
# Manual backup
docker compose exec mongodb mongodump --out=/data/backup

# Automated daily backup (add to crontab)
0 2 * * * cd /path/to/linksnip && docker compose exec -T mongodb mongodump --out=/data/backup/$(date +\%Y\%m\%d)
```

### Application Backup

```bash
# Backup configuration
tar -czf linksnip-config-$(date +%Y%m%d).tar.gz backend/.env frontend/.env docker-compose.yml
```

## Rollback Plan

If something goes wrong:

```bash
# Stop services
docker compose down

# Restore from backup
# ... restore database and configuration ...

# Restart with previous version
git checkout <previous-commit>
docker compose up -d --build
```

## Performance Optimization

- [ ] Enable Nginx caching for static assets
- [ ] Configure MongoDB indexes (already done in application)
- [ ] Set up CDN for static assets (optional)
- [ ] Enable gzip compression in Nginx
- [ ] Monitor and optimize database queries

## Security Hardening

- [ ] Disable root SSH login
- [ ] Use SSH keys instead of passwords
- [ ] Configure fail2ban
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Implement IP whitelisting for admin endpoints (optional)

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs -f

# Check disk space
df -h

# Check Docker status
docker ps -a
```

### Database connection issues

```bash
# Check MongoDB logs
docker compose logs mongodb

# Verify MongoDB is running
docker compose ps
```

### High memory usage

```bash
# Check resource usage
docker stats

# Restart services if needed
docker compose restart
```

## Support

For issues or questions:

- Check [GitHub Issues](https://github.com/ridzwandanis/linksnip/issues)
- Review [Documentation](README.md)
- Check [Security Policy](SECURITY.md)
