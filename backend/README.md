# URL Shortener

A RESTful API service for URL shortening built with Node.js, Express.js, and MongoDB.

## Features

- Create short URLs from long URLs
- Custom short codes for branded, memorable links
- Redirect from short URLs to original URLs
- Track click statistics with detailed analytics
- Rate limiting to prevent abuse
- Analytics dashboard with authentication
- Retrieve URL information
- Delete URL mappings
- Comprehensive error handling
- Request and error logging

## Tech Stack

- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **ID Generation**: nanoid
- **Validation**: joi
- **Testing**: Jest with fast-check for property-based testing
- **Logging**: winston + morgan

## Getting Started

### Prerequisites

- Node.js v18 or higher
- MongoDB v6.0 or higher

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration

### Running the Application

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

### Testing

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run tests with coverage:

```bash
npm run test:coverage
```

### Code Quality

Lint code:

```bash
npm run lint
```

Fix linting issues:

```bash
npm run lint:fix
```

Format code:

```bash
npm run format
```

## Project Structure

```
src/
├── config/       # Configuration files
├── middleware/   # Express middleware
├── models/       # Mongoose models
├── routes/       # API routes
├── services/     # Business logic
├── utils/        # Utility functions
└── server.js     # Application entry point
```

## API Documentation

### Postman Collection

A complete Postman collection is available in `postman_collection.json` with:

- All API endpoints with example requests
- Pre-configured test scripts
- Example responses for success and error cases
- Complete workflow examples

To use the collection:

1. Import `postman_collection.json` into Postman
2. Import `postman_environment.json` for environment variables
3. Select "URL Shortener - Local" environment
4. Run requests individually or use the "Example Workflow" folder to test the complete flow

### Base URL

```
http://localhost:3000
```

### Endpoints

#### 1. Create Short URL

Create a shortened URL from a long URL.

**Endpoint:** `POST /api/shorten`

**Request Body:**

```json
{
  "url": "https://example.com/very/long/url/that/needs/shortening"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "shortUrl": "http://localhost:3000/abc123",
    "originalUrl": "https://example.com/very/long/url/that/needs/shortening",
    "createdAt": "2025-11-25T10:00:00.000Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid URL format or empty URL

```json
{
  "success": false,
  "error": "Invalid URL format"
}
```

- **500 Internal Server Error** - Server error

```json
{
  "success": false,
  "error": "Internal server error"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/url"}'
```

---

#### 2. Redirect to Original URL

Access a short URL and get redirected to the original URL.

**Endpoint:** `GET /:shortcode`

**Parameters:**

- `shortcode` (path parameter) - The short code of the URL

**Success Response (301 Moved Permanently):**

Redirects to the original URL and increments the click counter.

**Error Responses:**

- **404 Not Found** - Short code does not exist or URL is inactive

```json
{
  "success": false,
  "error": "URL not found"
}
```

**Example:**

```bash
curl -L http://localhost:3000/abc123
```

---

#### 3. Get URL Information

Retrieve detailed information about a shortened URL.

**Endpoint:** `GET /api/urls/:shortcode`

**Parameters:**

- `shortcode` (path parameter) - The short code of the URL

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/abc123",
    "createdAt": "2025-11-25T10:00:00.000Z",
    "updatedAt": "2025-11-25T10:00:00.000Z",
    "clicks": 42,
    "isActive": true
  }
}
```

**Error Responses:**

- **404 Not Found** - Short code does not exist

```json
{
  "success": false,
  "error": "URL not found"
}
```

**Example:**

```bash
curl http://localhost:3000/api/urls/abc123
```

---

#### 4. Delete URL

Delete a shortened URL mapping.

**Endpoint:** `DELETE /api/urls/:shortcode`

**Parameters:**

- `shortcode` (path parameter) - The short code of the URL to delete

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "URL deleted successfully"
}
```

**Error Responses:**

- **404 Not Found** - Short code does not exist

```json
{
  "success": false,
  "error": "URL not found"
}
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/urls/abc123
```

---

#### 5. Health Check

Check the health status of the service and database connection.

**Endpoint:** `GET /health`

**Success Response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T10:00:00.000Z",
  "database": "connected"
}
```

**Error Response (503 Service Unavailable):**

```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-25T10:00:00.000Z",
  "database": "disconnected"
}
```

**Example:**

```bash
curl http://localhost:3000/health
```

---

### Error Codes

The API uses standard HTTP status codes to indicate the success or failure of requests:

| Status Code | Meaning               | Description                                   |
| ----------- | --------------------- | --------------------------------------------- |
| 200         | OK                    | Request succeeded                             |
| 201         | Created               | Resource created successfully                 |
| 301         | Moved Permanently     | Redirect to original URL                      |
| 400         | Bad Request           | Invalid input or validation error             |
| 401         | Unauthorized          | Missing or invalid authentication credentials |
| 404         | Not Found             | Resource not found                            |
| 409         | Conflict              | Custom short code already exists              |
| 429         | Too Many Requests     | Rate limit exceeded                           |
| 500         | Internal Server Error | Unexpected server error                       |
| 503         | Service Unavailable   | Database connection error                     |

### Error Response Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": {
    "field": "fieldName",
    "code": "ERROR_CODE"
  }
}
```

### Validation Rules

#### URL Validation

- Must be a valid URL format (http:// or https://)
- Maximum length: 2048 characters
- Cannot be empty or whitespace only
- Must have a valid domain structure

#### Short Code Format (Auto-generated)

- Length: 6 characters (default, configurable via `SHORT_CODE_LENGTH`)
- Characters: 0-9, A-Z, a-z (URL-safe alphabet)
- Unique across all URLs

#### Custom Short Code Validation

- Length: 3-20 characters
- Allowed characters: alphanumeric (a-z, A-Z, 0-9) and hyphens (-)
- Case-insensitive (converted to lowercase before storage)
- Cannot be a reserved word: `api`, `health`, `admin`, `analytics`, `dashboard`, `stats`, `docs`, `help`
- Must be unique (case-insensitive check)

### Rate Limiting

The API implements rate limiting to prevent abuse. By default, clients are limited to 10 requests per minute per IP address on the URL creation endpoint (`POST /api/shorten`).

**Rate Limit Headers:**

All responses from rate-limited endpoints include the following headers:

| Header                  | Description                                 |
| ----------------------- | ------------------------------------------- |
| `X-RateLimit-Limit`     | Maximum requests allowed per window         |
| `X-RateLimit-Remaining` | Remaining requests in current window        |
| `X-RateLimit-Reset`     | Unix timestamp when the rate limit resets   |
| `Retry-After`           | Seconds until retry (only on 429 responses) |

**Rate Limit Error Response (429 Too Many Requests):**

```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "retryAfter": 45
}
```

**Note:** Redirect requests (`GET /:shortcode`) are NOT rate limited to ensure normal URL access.

### Custom Short Codes

You can specify a custom short code when creating a URL by including the `customCode` field in the request body:

**Endpoint:** `POST /api/shorten`

**Request Body:**

```json
{
  "url": "https://example.com/very/long/url",
  "customCode": "my-link"
}
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "shortCode": "my-link",
    "shortUrl": "http://localhost:3000/my-link",
    "originalUrl": "https://example.com/very/long/url",
    "createdAt": "2025-11-25T10:00:00.000Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid custom code format

```json
{
  "success": false,
  "error": "Custom code can only contain alphanumeric characters and hyphens",
  "code": "INVALID_CHARACTERS"
}
```

- **409 Conflict** - Custom code already exists

```json
{
  "success": false,
  "error": "Custom code 'my-link' is already in use",
  "code": "CODE_EXISTS"
}
```

**Custom Code Rules:**

| Rule           | Description                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ |
| Length         | Must be 3-20 characters long                                                               |
| Characters     | Only alphanumeric characters (a-z, A-Z, 0-9) and hyphens (-) allowed                       |
| Case Handling  | Case-insensitive (stored as lowercase). "MyLink" and "mylink" are treated as the same code |
| Reserved Words | Cannot use: `api`, `health`, `admin`, `analytics`, `dashboard`, `stats`, `docs`, `help`    |
| Uniqueness     | Must be unique across all URLs (case-insensitive check)                                    |

**Example:**

```bash
# Create URL with custom code
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "customCode": "my-link"}'

# Create URL without custom code (random code generated)
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

---

### Analytics Endpoints

Analytics endpoints provide detailed usage statistics for your shortened URLs. All analytics endpoints require HTTP Basic Authentication.

**Authentication:**

Configure credentials using `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables. Use HTTP Basic Authentication to access these endpoints.

```bash
curl -u admin:your-password http://localhost:3000/api/analytics/system
```

---

#### 6. Get URL Analytics

Get detailed analytics for a specific shortened URL.

**Endpoint:** `GET /api/analytics/urls/:shortcode`

**Parameters:**

- `shortcode` (path parameter) - The short code of the URL
- `startDate` (query parameter, optional) - Filter clicks from this date (ISO 8601 format)
- `endDate` (query parameter, optional) - Filter clicks until this date (ISO 8601 format)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "shortCode": "my-link",
    "originalUrl": "https://example.com",
    "totalClicks": 150,
    "uniqueVisitors": 98,
    "lastClickAt": "2025-11-25T15:30:00.000Z",
    "topReferrers": [
      { "source": "google.com", "count": 45 },
      { "source": "twitter.com", "count": 32 },
      { "source": "direct", "count": 73 }
    ],
    "clicksByDay": [
      { "date": "2025-11-25", "count": 25 },
      { "date": "2025-11-24", "count": 18 }
    ],
    "topBrowsers": [
      { "browser": "Chrome", "count": 85 },
      { "browser": "Firefox", "count": 40 }
    ],
    "topOS": [
      { "os": "Windows", "count": 70 },
      { "os": "macOS", "count": 50 }
    ]
  }
}
```

**Error Responses:**

- **401 Unauthorized** - Missing or invalid credentials
- **404 Not Found** - Short code does not exist

**Example:**

```bash
# Get all analytics for a URL
curl -u admin:password http://localhost:3000/api/analytics/urls/my-link

# Get analytics with time range filter
curl -u admin:password "http://localhost:3000/api/analytics/urls/my-link?startDate=2025-11-01&endDate=2025-11-30"
```

---

#### 7. Get System Analytics

Get system-wide analytics including total URLs, total clicks, and most popular URLs.

**Endpoint:** `GET /api/analytics/system`

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totalUrls": 1250,
    "totalClicks": 45000,
    "activeUrls": 1180,
    "clicksToday": 320,
    "clicksThisWeek": 2100,
    "clicksThisMonth": 8500
  }
}
```

**Example:**

```bash
curl -u admin:password http://localhost:3000/api/analytics/system
```

---

#### 8. Get Popular URLs

Get the most popular URLs sorted by total clicks.

**Endpoint:** `GET /api/analytics/popular`

**Parameters:**

- `limit` (query parameter, optional) - Number of URLs to return (default: 10, max: 100)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "shortCode": "popular1",
      "originalUrl": "https://example.com/popular",
      "totalClicks": 5000,
      "uniqueVisitors": 3200
    },
    {
      "shortCode": "popular2",
      "originalUrl": "https://example.com/another",
      "totalClicks": 3500,
      "uniqueVisitors": 2100
    }
  ]
}
```

**Example:**

```bash
# Get top 10 popular URLs (default)
curl -u admin:password http://localhost:3000/api/analytics/popular

# Get top 5 popular URLs
curl -u admin:password "http://localhost:3000/api/analytics/popular?limit=5"
```

---

### Analytics Data Collection

When a user accesses a shortened URL, the system automatically collects the following analytics data:

| Data Point       | Description                                           |
| ---------------- | ----------------------------------------------------- |
| Timestamp        | When the click occurred                               |
| IP Address       | Anonymized (last octet masked, e.g., "192.168.1.xxx") |
| Browser          | Browser name (Chrome, Firefox, Safari, etc.)          |
| Operating System | OS name (Windows, macOS, Linux, iOS, Android)         |
| Referrer         | Source URL or "direct" if no referrer                 |

**Privacy Features:**

- IP addresses are anonymized by masking the last octet
- Only browser and OS names are stored, not full user agent strings
- Detailed click events are automatically deleted after 90 days (configurable)
- Aggregated statistics are preserved even after click events are deleted

**Note:** Analytics recording is asynchronous and does not delay the redirect response.

### Examples

#### Complete Workflow Example

1. **Create a short URL with custom code:**

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/nodejs/node", "customCode": "nodejs"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "shortCode": "nodejs",
    "shortUrl": "http://localhost:3000/nodejs",
    "originalUrl": "https://github.com/nodejs/node",
    "createdAt": "2025-11-25T10:00:00.000Z"
  }
}
```

2. **Create a short URL without custom code (random generation):**

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/nodejs/node"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "shortCode": "gh1x2y",
    "shortUrl": "http://localhost:3000/gh1x2y",
    "originalUrl": "https://github.com/nodejs/node",
    "createdAt": "2025-11-25T10:00:00.000Z"
  }
}
```

3. **Get URL information:**

```bash
curl http://localhost:3000/api/urls/nodejs
```

Response:

```json
{
  "success": true,
  "data": {
    "shortCode": "nodejs",
    "originalUrl": "https://github.com/nodejs/node",
    "shortUrl": "http://localhost:3000/nodejs",
    "createdAt": "2025-11-25T10:00:00.000Z",
    "updatedAt": "2025-11-25T10:00:00.000Z",
    "clicks": 0,
    "isActive": true,
    "analytics": {
      "totalClicks": 0,
      "uniqueVisitors": 0
    }
  }
}
```

4. **Access the short URL (redirect):**

```bash
curl -L http://localhost:3000/nodejs
```

This will redirect you to `https://github.com/nodejs/node` and record analytics data (timestamp, anonymized IP, browser, OS, referrer).

5. **Verify click count increased:**

```bash
curl http://localhost:3000/api/urls/nodejs
```

Response shows `clicks: 1` and updated analytics.

6. **View detailed analytics (requires authentication):**

```bash
curl -u admin:your-password http://localhost:3000/api/analytics/urls/nodejs
```

Response:

```json
{
  "success": true,
  "data": {
    "shortCode": "nodejs",
    "originalUrl": "https://github.com/nodejs/node",
    "totalClicks": 1,
    "uniqueVisitors": 1,
    "lastClickAt": "2025-11-25T10:05:00.000Z",
    "topReferrers": [{ "source": "direct", "count": 1 }],
    "clicksByDay": [{ "date": "2025-11-25", "count": 1 }]
  }
}
```

7. **View system-wide analytics:**

```bash
curl -u admin:your-password http://localhost:3000/api/analytics/system
```

8. **Delete the URL:**

```bash
curl -X DELETE http://localhost:3000/api/urls/nodejs
```

Response:

```json
{
  "success": true,
  "message": "URL deleted successfully"
}
```

#### Rate Limiting Example

When you exceed the rate limit (default: 10 requests per minute):

```bash
# After making 10 requests within 1 minute
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Response (429 Too Many Requests):

```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "retryAfter": 45
}
```

Headers included:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700910900
Retry-After: 45
```

#### Custom Code Error Examples

**Invalid characters:**

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "customCode": "my_link!"}'
```

Response (400 Bad Request):

```json
{
  "success": false,
  "error": "Custom code can only contain alphanumeric characters and hyphens"
}
```

**Reserved word:**

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "customCode": "api"}'
```

Response (400 Bad Request):

```json
{
  "success": false,
  "error": "Custom code 'api' is reserved and cannot be used"
}
```

**Code already exists:**

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "customCode": "nodejs"}'
```

Response (409 Conflict):

```json
{
  "success": false,
  "error": "Custom code 'nodejs' is already in use"
}
```

## Environment Variables

Configure the application using the following environment variables in your `.env` file:

### Server Configuration

| Variable   | Description                               | Default     | Required |
| ---------- | ----------------------------------------- | ----------- | -------- |
| `NODE_ENV` | Environment mode (development/production) | development | No       |
| `PORT`     | Server port                               | 3000        | No       |

### Database Configuration

| Variable      | Description               | Default                                 | Required |
| ------------- | ------------------------- | --------------------------------------- | -------- |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/url-shortener | Yes      |

### Application Configuration

| Variable            | Description                           | Default               | Required |
| ------------------- | ------------------------------------- | --------------------- | -------- |
| `BASE_URL`          | Base URL for short URL generation     | http://localhost:3000 | Yes      |
| `LOG_LEVEL`         | Logging level (error/warn/info/debug) | info                  | No       |
| `SHORT_CODE_LENGTH` | Length of generated short codes       | 6                     | No       |

### Rate Limiting Configuration

| Variable                  | Description                                       | Default | Required |
| ------------------------- | ------------------------------------------------- | ------- | -------- |
| `RATE_LIMIT_ENABLED`      | Enable/disable rate limiting (true/false)         | true    | No       |
| `RATE_LIMIT_WINDOW_MS`    | Time window in milliseconds                       | 60000   | No       |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum requests per window per IP (0 to disable) | 10      | No       |

**Notes:**

- Setting `RATE_LIMIT_MAX_REQUESTS=0` disables rate limiting
- Invalid values will trigger a warning and use defaults
- Rate limiting only applies to `POST /api/shorten`, not redirects

### Admin Authentication Configuration

| Variable         | Description                  | Default | Required |
| ---------------- | ---------------------------- | ------- | -------- |
| `ADMIN_USERNAME` | Username for HTTP Basic Auth | -       | Yes\*    |
| `ADMIN_PASSWORD` | Password for HTTP Basic Auth | -       | Yes\*    |

\*Required for accessing analytics endpoints. If not configured, analytics endpoints will return 401 errors.

**Security Recommendations:**

- Use a strong password (8+ characters) in production
- Change the default password before deploying
- Use HTTPS in production to protect credentials in transit

### Analytics Configuration

| Variable                   | Description                          | Default | Required |
| -------------------------- | ------------------------------------ | ------- | -------- |
| `ANALYTICS_RETENTION_DAYS` | Days to retain detailed click events | 90      | No       |

**Notes:**

- Click events older than the retention period are automatically deleted
- Aggregated statistics in URL documents are preserved even after click events are deleted

## License

MIT
