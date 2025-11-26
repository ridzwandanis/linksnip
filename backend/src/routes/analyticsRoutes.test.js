const request = require('supertest');
const express = require('express');
const analyticsRoutes = require('./analyticsRoutes');
const AnalyticsService = require('../services/AnalyticsService');
const Url = require('../models/Url');
const ClickEvent = require('../models/ClickEvent');
const { errorHandler } = require('../middleware');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/', analyticsRoutes);
app.use(errorHandler);

// Mock environment variables for authentication
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD = 'testpassword';

// Helper to create Basic Auth header
function createAuthHeader(username, password) {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${credentials}`;
}

// Mock database storage
let savedUrls = new Map();
let savedClickEvents = [];

beforeEach(() => {
  savedUrls.clear();
  savedClickEvents = [];

  // Mock Url.findOne
  Url.findOne = jest.fn(async ({ shortCode }) => {
    const data = savedUrls.get(shortCode);
    if (!data) return null;

    return {
      ...data,
      save: jest.fn(async function () {
        savedUrls.set(this.shortCode, this);
        return this;
      }),
    };
  });

  // Mock Url.countDocuments
  Url.countDocuments = jest.fn(async () => {
    return savedUrls.size;
  });

  // Mock Url.find
  Url.find = jest.fn(() => {
    const urls = Array.from(savedUrls.values()).filter((url) => url.isActive);
    return {
      sort: jest.fn((sortCriteria) => {
        // Sort by totalClicks descending
        const sorted = [...urls].sort((a, b) => {
          const aClicks = a.analytics?.totalClicks || 0;
          const bClicks = b.analytics?.totalClicks || 0;
          return bClicks - aClicks;
        });
        return {
          limit: jest.fn((limitNum) => ({
            select: jest.fn(() => sorted.slice(0, limitNum)),
          })),
        };
      }),
    };
  });

  // Mock ClickEvent.find
  ClickEvent.find = jest.fn((query) => {
    let events = savedClickEvents.filter(
      (e) => e.shortCode === query.shortCode
    );

    // Apply time range filtering
    if (query.timestamp) {
      if (query.timestamp.$gte) {
        events = events.filter((e) => e.timestamp >= query.timestamp.$gte);
      }
      if (query.timestamp.$lte) {
        events = events.filter((e) => e.timestamp <= query.timestamp.$lte);
      }
    }

    return {
      sort: jest.fn(() => events),
    };
  });

  // Mock ClickEvent.countDocuments
  ClickEvent.countDocuments = jest.fn((query = {}) => {
    let events = savedClickEvents;

    // Apply time range filtering
    if (query.timestamp) {
      if (query.timestamp.$gte) {
        events = events.filter((e) => e.timestamp >= query.timestamp.$gte);
      }
      if (query.timestamp.$lte) {
        events = events.filter((e) => e.timestamp <= query.timestamp.$lte);
      }
    }

    return Promise.resolve(events.length);
  });

  // Mock ClickEvent.distinct
  ClickEvent.distinct = jest.fn((field, query = {}) => {
    let events = savedClickEvents;

    if (query.shortCode) {
      events = events.filter((e) => e.shortCode === query.shortCode);
    }

    // Apply time range filtering
    if (query.timestamp) {
      if (query.timestamp.$gte) {
        events = events.filter((e) => e.timestamp >= query.timestamp.$gte);
      }
      if (query.timestamp.$lte) {
        events = events.filter((e) => e.timestamp <= query.timestamp.$lte);
      }
    }

    const values = events.map((e) => e[field]);
    return Promise.resolve([...new Set(values)]);
  });
});

/**
 * Integration Tests for Analytics Routes
 * Requirements: 6.1, 6.2, 6.3, 6.5, 10.1
 */

describe('Analytics Routes - Authentication', () => {
  test('should return 401 for URL analytics endpoint without auth', async () => {
    const response = await request(app).get('/api/analytics/urls/test123');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Authentication required');
    expect(response.headers['www-authenticate']).toBeDefined();
  });

  test('should return 401 for system analytics endpoint without auth', async () => {
    const response = await request(app).get('/api/analytics/system');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Authentication required');
  });

  test('should return 401 for popular URLs endpoint without auth', async () => {
    const response = await request(app).get('/api/analytics/popular');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Authentication required');
  });

  test('should return 401 with invalid credentials', async () => {
    const authHeader = createAuthHeader('wronguser', 'wrongpass');
    const response = await request(app)
      .get('/api/analytics/urls/test123')
      .set('Authorization', authHeader);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Invalid credentials');
  });

  test('should allow access with valid credentials', async () => {
    // Create a test URL
    savedUrls.set('test123', {
      shortCode: 'test123',
      originalUrl: 'https://example.com',
      isActive: true,
      analytics: {
        totalClicks: 0,
        uniqueVisitors: 0,
        topReferrers: [],
        clicksByDay: [],
      },
    });

    const authHeader = createAuthHeader('testadmin', 'testpassword');
    const response = await request(app)
      .get('/api/analytics/urls/test123')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });
});

describe('Analytics Routes - URL Analytics', () => {
  test('should return analytics for existing short code', async () => {
    // Create test URL
    savedUrls.set('test123', {
      shortCode: 'test123',
      originalUrl: 'https://example.com',
      isActive: true,
      analytics: {
        totalClicks: 5,
        uniqueVisitors: 3,
        topReferrers: [{ source: 'google.com', count: 3 }],
        clicksByDay: [{ date: new Date(), count: 5 }],
      },
    });

    // Create test click events
    savedClickEvents.push(
      {
        shortCode: 'test123',
        timestamp: new Date(),
        anonymizedIp: '192.168.1.xxx',
        browser: 'Chrome',
        os: 'Windows',
        referrer: 'google.com',
      },
      {
        shortCode: 'test123',
        timestamp: new Date(),
        anonymizedIp: '192.168.2.xxx',
        browser: 'Firefox',
        os: 'macOS',
        referrer: 'direct',
      }
    );

    const authHeader = createAuthHeader('testadmin', 'testpassword');
    const response = await request(app)
      .get('/api/analytics/urls/test123')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.shortCode).toBe('test123');
    expect(response.body.data.totalClicks).toBeDefined();
    expect(response.body.data.uniqueVisitors).toBeDefined();
    expect(response.body.data.topReferrers).toBeDefined();
    expect(response.body.data.clickHistory).toBeDefined();
  });

  test('should return 404 for non-existent short code', async () => {
    const authHeader = createAuthHeader('testadmin', 'testpassword');
    const response = await request(app)
      .get('/api/analytics/urls/nonexistent')
      .set('Authorization', authHeader);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Short URL not found');
  });

  test('should filter analytics by time range', async () => {
    // Create test URL
    savedUrls.set('test123', {
      shortCode: 'test123',
      originalUrl: 'https://example.com',
      isActive: true,
      analytics: {
        totalClicks: 10,
        uniqueVisitors: 5,
        topReferrers: [],
        clicksByDay: [],
      },
    });

    // Create click events with different timestamps
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    savedClickEvents.push(
      {
        shortCode: 'test123',
        timestamp: now,
        anonymizedIp: '192.168.1.xxx',
        browser: 'Chrome',
        os: 'Windows',
        referrer: 'google.com',
      },
      {
        shortCode: 'test123',
        timestamp: yesterday,
        anonymizedIp: '192.168.2.xxx',
        browser: 'Firefox',
        os: 'macOS',
        referrer: 'direct',
      },
      {
        shortCode: 'test123',
        timestamp: twoDaysAgo,
        anonymizedIp: '192.168.3.xxx',
        browser: 'Safari',
        os: 'iOS',
        referrer: 'twitter.com',
      }
    );

    const authHeader = createAuthHeader('testadmin', 'testpassword');
    const response = await request(app)
      .get('/api/analytics/urls/test123')
      .query({ startDate: yesterday.toISOString() })
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalClicks).toBe(2); // Only events from yesterday and today
  });
});

describe('Analytics Routes - System Analytics', () => {
  test('should return system-wide analytics', async () => {
    // Create test URLs
    savedUrls.set('test1', {
      shortCode: 'test1',
      originalUrl: 'https://example1.com',
      isActive: true,
      analytics: { totalClicks: 10, uniqueVisitors: 5 },
    });
    savedUrls.set('test2', {
      shortCode: 'test2',
      originalUrl: 'https://example2.com',
      isActive: true,
      analytics: { totalClicks: 20, uniqueVisitors: 8 },
    });

    // Create test click events
    savedClickEvents.push(
      {
        shortCode: 'test1',
        timestamp: new Date(),
        anonymizedIp: '192.168.1.xxx',
        browser: 'Chrome',
        os: 'Windows',
        referrer: 'google.com',
      },
      {
        shortCode: 'test2',
        timestamp: new Date(),
        anonymizedIp: '192.168.2.xxx',
        browser: 'Firefox',
        os: 'macOS',
        referrer: 'direct',
      }
    );

    const authHeader = createAuthHeader('testadmin', 'testpassword');
    const response = await request(app)
      .get('/api/analytics/system')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.totalUrls).toBe(2);
    expect(response.body.data.totalClicks).toBeDefined();
    expect(response.body.data.uniqueVisitors).toBeDefined();
    expect(response.body.data.popularUrls).toBeDefined();
  });

  test('should filter system analytics by time range', async () => {
    // Create test URLs
    savedUrls.set('test1', {
      shortCode: 'test1',
      originalUrl: 'https://example1.com',
      isActive: true,
      analytics: { totalClicks: 10, uniqueVisitors: 5 },
    });

    // Create click events with different timestamps
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    savedClickEvents.push(
      {
        shortCode: 'test1',
        timestamp: now,
        anonymizedIp: '192.168.1.xxx',
        browser: 'Chrome',
        os: 'Windows',
        referrer: 'google.com',
      },
      {
        shortCode: 'test1',
        timestamp: yesterday,
        anonymizedIp: '192.168.2.xxx',
        browser: 'Firefox',
        os: 'macOS',
        referrer: 'direct',
      }
    );

    const authHeader = createAuthHeader('testadmin', 'testpassword');
    const response = await request(app)
      .get('/api/analytics/system')
      .query({ startDate: now.toISOString() })
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalClicks).toBe(1); // Only today's click
  });
});

describe('Analytics Routes - Popular URLs', () => {
  test('should return most popular URLs', async () => {
    // Create test URLs with different click counts
    savedUrls.set('popular1', {
      shortCode: 'popular1',
      originalUrl: 'https://example1.com',
      isActive: true,
      analytics: { totalClicks: 100, uniqueVisitors: 50 },
    });
    savedUrls.set('popular2', {
      shortCode: 'popular2',
      originalUrl: 'https://example2.com',
      isActive: true,
      analytics: { totalClicks: 50, uniqueVisitors: 30 },
    });
    savedUrls.set('popular3', {
      shortCode: 'popular3',
      originalUrl: 'https://example3.com',
      isActive: true,
      analytics: { totalClicks: 25, uniqueVisitors: 15 },
    });

    const authHeader = createAuthHeader('testadmin', 'testpassword');
    const response = await request(app)
      .get('/api/analytics/popular')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('should respect limit parameter', async () => {
    // Create multiple test URLs
    for (let i = 0; i < 15; i++) {
      savedUrls.set(`url${i}`, {
        shortCode: `url${i}`,
        originalUrl: `https://example${i}.com`,
        isActive: true,
        analytics: { totalClicks: 100 - i, uniqueVisitors: 50 - i },
      });
    }

    const authHeader = createAuthHeader('testadmin', 'testpassword');
    const response = await request(app)
      .get('/api/analytics/popular')
      .query({ limit: 5 })
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeLessThanOrEqual(5);
  });
});
