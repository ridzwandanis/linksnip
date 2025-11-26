# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please do the following:

1. **Do NOT** open a public issue
2. Email the maintainers directly (or use GitHub Security Advisories)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to resolve the issue.

## Security Best Practices

When deploying LinkSnip:

### Required

- Change default admin credentials immediately
- Use strong passwords (minimum 12 characters)
- Use HTTPS in production
- Keep dependencies updated
- Use environment variables for sensitive data

### Recommended

- Enable rate limiting
- Use a reverse proxy (Nginx/Caddy)
- Implement firewall rules
- Regular database backups
- Monitor logs for suspicious activity
- Use Docker secrets for production deployments

### Database Security

- Use strong MongoDB passwords
- Restrict MongoDB network access
- Enable MongoDB authentication
- Regular backups

### Environment Variables

Never commit these files:

- `.env`
- `.env.local`
- `.env.production`

Always use `.env.example` as a template.

## Known Security Considerations

1. **IP Anonymization**: User IPs are anonymized by masking the last octet
2. **Rate Limiting**: Enabled by default to prevent abuse
3. **Basic Auth**: Analytics endpoints use HTTP Basic Authentication
4. **Data Retention**: Click events are automatically deleted after 90 days

## Updates

We recommend:

- Regularly update dependencies: `npm audit fix`
- Monitor GitHub Security Advisories
- Subscribe to security mailing lists for Node.js and MongoDB
