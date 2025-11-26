# LinkSnip Architecture

This document describes the architecture and design decisions of LinkSnip.

## System Overview

LinkSnip is a full-stack URL shortening service consisting of:

- **Backend**: RESTful API built with Node.js and Express
- **Frontend**: Single-page application built with React
- **Database**: MongoDB for data persistence

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────┐
│  Nginx (Proxy)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌─────────┐
│Frontend│ │ Backend │
│(React) │ │(Express)│
└────────┘ └────┬────┘
                │
                ▼
           ┌─────────┐
           │ MongoDB │
           └─────────┘
```

## Backend Architecture

### Layers

1. **Routes Layer** (`src/routes/`)

   - Defines API endpoints
   - Handles HTTP request routing
   - Applies middleware

2. **Middleware Layer** (`src/middleware/`)

   - Authentication (Basic Auth)
   - Rate limiting
   - Error handling
   - Request logging

3. **Controller Layer** (`src/controllers/`)

   - Request validation
   - Business logic orchestration
   - Response formatting

4. **Service Layer** (`src/services/`)

   - Core business logic
   - Data processing
   - Analytics calculations

5. **Model Layer** (`src/models/`)
   - Database schemas
   - Data validation
   - Database operations

### Key Components

#### URL Shortening

- Uses `nanoid` for generating short codes
- Configurable code length (default: 6 characters)
- Collision detection and retry logic
- Custom code validation and reservation

#### Analytics

- Asynchronous click tracking
- IP anonymization (last octet masked)
- User agent parsing for browser/OS detection
- Aggregated statistics in URL documents
- Detailed click events with automatic cleanup

#### Rate Limiting

- IP-based rate limiting
- Configurable limits and time windows
- Only applies to URL creation endpoint
- Returns standard rate limit headers

## Frontend Architecture

### Structure

```
src/
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── lib/            # Utility libraries
├── pages/          # Page components
├── services/       # API service layer
└── utils/          # Helper functions
```

### Key Features

1. **State Management**

   - TanStack Query for server state
   - React hooks for local state
   - Context API for auth state

2. **Routing**

   - React Router for navigation
   - Protected routes for admin pages
   - Redirect handling

3. **UI Components**

   - shadcn/ui component library
   - Tailwind CSS for styling
   - Responsive design

4. **Data Fetching**
   - TanStack Query for caching
   - Automatic refetching
   - Optimistic updates

## Database Schema

### URL Collection

```javascript
{
  shortCode: String (unique, indexed),
  originalUrl: String,
  createdAt: Date,
  updatedAt: Date,
  clicks: Number,
  isActive: Boolean,
  analytics: {
    totalClicks: Number,
    uniqueVisitors: Number,
    lastClickAt: Date
  }
}
```

### Click Collection

```javascript
{
  shortCode: String (indexed),
  timestamp: Date (indexed, TTL),
  ip: String (anonymized),
  userAgent: String,
  referrer: String,
  browser: String,
  os: String
}
```

### Indexes

- `shortCode`: Unique index for fast lookups
- `clicks.timestamp`: TTL index for automatic cleanup
- `clicks.shortCode`: Index for analytics queries

## Data Flow

### URL Creation

```
User → Frontend → POST /api/shorten → Validation
  → Generate/Validate Code → Save to DB → Return Short URL
```

### URL Redirect

```
User → GET /:code → Find URL → Record Click (async)
  → Redirect (301) → Original URL
```

### Analytics

```
Admin → Frontend → GET /api/analytics → Auth Check
  → Query DB → Aggregate Data → Return Stats
```

## Security Measures

1. **Input Validation**

   - Joi schema validation
   - URL format validation
   - Custom code sanitization

2. **Authentication**

   - HTTP Basic Auth for admin endpoints
   - Environment-based credentials
   - Secure password requirements

3. **Privacy**

   - IP address anonymization
   - No PII collection
   - Automatic data cleanup

4. **Rate Limiting**
   - IP-based throttling
   - Configurable limits
   - Prevents abuse

## Performance Optimizations

1. **Database**

   - Indexed queries
   - Aggregation pipelines
   - Connection pooling

2. **Caching**

   - Frontend query caching
   - Static asset caching
   - Browser caching headers

3. **Async Operations**
   - Non-blocking click recording
   - Background data cleanup
   - Async analytics processing

## Scalability Considerations

### Current Limitations

- Single MongoDB instance
- In-memory rate limiting
- No horizontal scaling

### Future Improvements

- MongoDB replica set
- Redis for rate limiting
- Load balancer support
- CDN integration
- Microservices architecture

## Deployment Architecture

### Docker Compose

```
┌──────────────────────────────────┐
│     Docker Compose Network       │
│                                  │
│  ┌──────────┐  ┌──────────┐    │
│  │ Frontend │  │ Backend  │    │
│  │  :80     │  │  :3000   │    │
│  └──────────┘  └────┬─────┘    │
│                     │            │
│                ┌────▼─────┐     │
│                │ MongoDB  │     │
│                │  :27017  │     │
│                └──────────┘     │
└──────────────────────────────────┘
```

### Production with Nginx

```
Internet → Nginx (:80/:443)
    ├─→ Frontend (static files)
    └─→ Backend (:3000)
           └─→ MongoDB (:27017)
```

## Technology Choices

### Why Node.js?

- Fast I/O operations
- Large ecosystem
- Easy deployment
- Good for APIs

### Why MongoDB?

- Flexible schema
- Good for analytics
- Easy to scale
- TTL indexes for cleanup

### Why React?

- Component reusability
- Large ecosystem
- Good developer experience
- Strong community

### Why Docker?

- Consistent environments
- Easy deployment
- Isolation
- Portability

## Testing Strategy

1. **Unit Tests**

   - Service layer logic
   - Utility functions
   - Validation logic

2. **Integration Tests**

   - API endpoints
   - Database operations
   - Middleware

3. **Property-Based Tests**
   - URL validation
   - Short code generation
   - Edge cases

## Monitoring and Logging

### Logging

- Winston for structured logging
- Morgan for HTTP logging
- Log levels: error, warn, info, debug
- Log rotation for production

### Metrics to Monitor

- Request rate
- Response times
- Error rates
- Database performance
- Disk usage
- Memory usage

## Future Enhancements

1. **Features**

   - User authentication
   - QR code generation
   - Custom domains
   - Link expiration
   - Password protection

2. **Infrastructure**

   - Redis caching
   - CDN integration
   - Multi-region deployment
   - Auto-scaling

3. **Analytics**
   - Real-time dashboard
   - Geographic data
   - Device analytics
   - Conversion tracking
