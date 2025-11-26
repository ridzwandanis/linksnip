# LinkSnip API Documentation

Complete API reference for LinkSnip URL Shortener.

For detailed API documentation with examples, see [backend/README.md](../backend/README.md).

## Quick Reference

### Base URL

```
http://localhost:3000
```

### Authentication

Analytics endpoints require HTTP Basic Authentication:

```bash
curl -u username:password http://localhost:3000/api/analytics/system
```

## Endpoints Overview

| Method | Endpoint                         | Auth Required | Description              |
| ------ | -------------------------------- | ------------- | ------------------------ |
| POST   | `/api/shorten`                   | No            | Create short URL         |
| GET    | `/:shortCode`                    | No            | Redirect to original URL |
| GET    | `/api/urls/:shortCode`           | No            | Get URL information      |
| DELETE | `/api/urls/:shortCode`           | Yes           | Delete URL               |
| GET    | `/api/analytics/urls/:shortCode` | Yes           | Get URL analytics        |
| GET    | `/api/analytics/system`          | Yes           | Get system analytics     |
| GET    | `/api/analytics/popular`         | Yes           | Get popular URLs         |
| GET    | `/health`                        | No            | Health check             |

## Rate Limiting

- **Endpoint**: `POST /api/shorten`
- **Limit**: 10 requests per minute per IP (configurable)
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 301  | Redirect              |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 404  | Not Found             |
| 409  | Conflict              |
| 429  | Too Many Requests     |
| 500  | Internal Server Error |

## Examples

### Create Short URL

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Create with Custom Code

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "customCode": "my-link"}'
```

### Get Analytics

```bash
curl -u admin:password http://localhost:3000/api/analytics/urls/my-link
```

For more examples and detailed documentation, see [backend/README.md](../backend/README.md).
