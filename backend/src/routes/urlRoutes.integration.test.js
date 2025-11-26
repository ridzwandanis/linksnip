const request = require('supertest');
const express = require('express');
const urlRoutes = require('./urlRoutes');
const Url = require('../models/Url');
const AnalyticsService = require('../services/AnalyticsService');
const ClickEvent = require('../models/ClickEvent');
const { errorHandler } = require('../middleware');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/', urlRoutes);
app.use(errorHandler);

// Mock database storage
let savedUrls = new Map();
let savedClickEvents = [];

// Get reference to rate limiter for cleanup
const { createRateLimiter } = require('../middleware/rateLimiter');
let rateLimiterInstance;

beforeAll(() => {
  rateLimiterInstance = createRateLimiter();
});

afterAll(() => {
  if (rateLimiterInstance) {
    rateLimiterInstance.stop();
  }
});

beforeEach(() => {
  savedUrls.clear();
  savedClickEvents = [];

  if (rateLimiterInstance) {
    rateLimiterInstance.reset();
  }

  // Mock Url.create - use save() instead
  Url.prototype.save = jest.fn(async function () {
    const urlDoc = {
      shortCode: this.shortCode,
      originalUrl: this.originalUrl,
      createdAt: this.createdAt || new Date(),
      updatedAt: this.updatedAt || new Date(),
      clicks: this.clicks || 0,
      isActive: this.isActive !== undefined ? this.isActive : true,
      metadata: this.metadata || {},
      customCode: this.customCode || false,
      analytics: this.analytics || {
        totalClicks: 0,
        uniqueVisitors: 0,
        lastClickAt: null,
        topReferrers: [],
        clicksByDay: [],
      },
    };
    savedUrls.set(this.shortCode, urlDoc);
    return urlDoc;
  });

  // Mock Url.findOne
  Url.findOne = jest.fn(async ({ shortCode }) => {
    const data = savedUrls.get(shortCode);
    return data || null;
  });

  // Mock Url.findOneAndUpdate
  Url.findOneAndUpdate = jest.fn(async ({ shortCode }, update) => {
    const data = savedUrls.get(shortCode);
    if (data && update.$inc && update.$inc.clicks) {
      data.clicks += update.$inc.clicks;
      savedUrls.set(shortCode, data);
    }
    return data || null;
  });

  // Mock AnalyticsService.recordClick
  jest.spyOn(AnalyticsService, 'recordClick').mockImplementation(async () => {
    return Promise.resolve();
  });
});

/**
 * Integration Tests for Updated URL Routes
 * Requirements: 1.1, 3.1, 5.1
 */
describe('Integration Tests - Updated URL Routes', () => {
  /**
   * Test URL creation with custom code
   * Requirements: 3.1
   */
  describe('POST /api/shorten with custom code', () => {
    test('should create URL with valid custom code', async () => {
      const response = await request(app).post('/api/shorten').send({
        url: 'https://example.com',
        customCode: 'mylink',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shortCode).toBe('mylink');
      expect(response.body.data.originalUrl).toBe('https://example.com');
    });

    test('should reject duplicate custom code', async () => {
      // Create first URL with custom code
      await request(app).post('/api/shorten').send({
        url: 'https://example.com',
        customCode: 'dupcode',
      });

      // Try to create second URL with same custom code
      const response = await request(app).post('/api/shorten').send({
        url: 'https://another-example.com',
        customCode: 'dupcode',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already in use');
    });

    test('should reject invalid custom code characters', async () => {
      const response = await request(app).post('/api/shorten').send({
        url: 'https://example.com',
        customCode: 'invalid@!',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('alphanumeric');
    });

    test('should reject reserved custom code', async () => {
      const response = await request(app).post('/api/shorten').send({
        url: 'https://example.com',
        customCode: 'api',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('reserved');
    });

    test('should normalize custom code to lowercase', async () => {
      const response = await request(app).post('/api/shorten').send({
        url: 'https://example.com',
        customCode: 'MyLink',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.shortCode).toBe('mylink');
    });

    test('should create URL without custom code (random generation)', async () => {
      const response = await request(app).post('/api/shorten').send({
        url: 'https://example.com',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shortCode).toBeDefined();
      expect(response.body.data.shortCode.length).toBeGreaterThanOrEqual(6);
    });
  });

  /**
   * Test URL creation with rate limiting
   * Requirements: 1.1
   */
  describe('POST /api/shorten with rate limiting', () => {
    test('should include rate limit headers in response', async () => {
      const response = await request(app).post('/api/shorten').send({
        url: 'https://example.com',
      });

      expect(response.status).toBe(201);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    test('should enforce rate limit after max requests', async () => {
      // Make 10 requests (the default limit)
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/shorten')
          .send({
            url: `https://example${i}.com`,
          });
        expect(response.status).toBe(201);
      }

      // 11th request should be rate limited
      const response = await request(app).post('/api/shorten').send({
        url: 'https://example-extra.com',
      });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Too many requests');
      expect(response.headers['retry-after']).toBeDefined();
    });
  });

  /**
   * Test redirect with analytics recording
   * Requirements: 5.1
   */
  describe('GET /:shortcode with analytics', () => {
    test('should redirect and record analytics asynchronously', async () => {
      // Create a URL
      savedUrls.set('test123', {
        shortCode: 'test123',
        originalUrl: 'https://example.com',
        isActive: true,
        clicks: 0,
      });

      // Access the short URL
      const response = await request(app)
        .get('/test123')
        .set('User-Agent', 'Mozilla/5.0 Chrome/91.0')
        .set('Referer', 'https://google.com');

      // Should redirect immediately
      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('https://example.com');

      // Analytics should be called (mocked)
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(AnalyticsService.recordClick).toHaveBeenCalledWith(
        'test123',
        expect.objectContaining({
          userAgent: expect.stringContaining('Chrome'),
          referrer: 'https://google.com',
        })
      );
    });

    test('should not record analytics for non-existent short code', async () => {
      const response = await request(app).get('/nonexist');

      expect(response.status).toBe(404);
      expect(AnalyticsService.recordClick).not.toHaveBeenCalled();
    });

    test('should not apply rate limiting to redirects', async () => {
      // Create a URL
      savedUrls.set('norlimit', {
        shortCode: 'norlimit',
        originalUrl: 'https://example.com',
        isActive: true,
        clicks: 0,
      });

      // Make many redirect requests (more than rate limit)
      for (let i = 0; i < 15; i++) {
        const response = await request(app).get('/norlimit');
        expect(response.status).toBe(301);
      }
    });
  });

  /**
   * Test URL info with analytics summary
   * Requirements: 5.1
   */
  describe('GET /api/urls/:shortcode with analytics', () => {
    test('should return URL info with analytics summary', async () => {
      // Create a URL with analytics data
      savedUrls.set('testinfo', {
        shortCode: 'testinfo',
        originalUrl: 'https://example.com',
        isActive: true,
        clicks: 42,
        analytics: {
          totalClicks: 42,
          uniqueVisitors: 28,
          lastClickAt: new Date('2025-11-25T15:30:00.000Z'),
          topReferrers: [
            { source: 'google.com', count: 15 },
            { source: 'twitter.com', count: 10 },
          ],
          clicksByDay: [
            { date: new Date('2025-11-25T00:00:00.000Z'), count: 12 },
            { date: new Date('2025-11-24T00:00:00.000Z'), count: 8 },
          ],
        },
      });

      const response = await request(app).get('/api/urls/testinfo');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shortCode).toBe('testinfo');
      expect(response.body.data.originalUrl).toBe('https://example.com');
      expect(response.body.data.analytics).toBeDefined();
      expect(response.body.data.analytics.totalClicks).toBe(42);
      expect(response.body.data.analytics.uniqueVisitors).toBe(28);
      expect(response.body.data.analytics.topReferrers).toHaveLength(2);
      expect(response.body.data.analytics.clicksByDay).toHaveLength(2);
    });

    test('should return default analytics for URL without analytics data', async () => {
      // Create a URL without analytics
      savedUrls.set('noanalytics', {
        shortCode: 'noanalytics',
        originalUrl: 'https://example.com',
        isActive: true,
        clicks: 0,
      });

      const response = await request(app).get('/api/urls/noanalytics');

      expect(response.status).toBe(200);
      expect(response.body.data.analytics).toBeDefined();
      expect(response.body.data.analytics.totalClicks).toBe(0);
      expect(response.body.data.analytics.uniqueVisitors).toBe(0);
      expect(response.body.data.analytics.lastClickAt).toBeNull();
      expect(response.body.data.analytics.topReferrers).toEqual([]);
      expect(response.body.data.analytics.clicksByDay).toEqual([]);
    });
  });
});
