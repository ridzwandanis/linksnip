const request = require('supertest');
const express = require('express');
const fc = require('fast-check');
const urlRoutes = require('./urlRoutes');
const Url = require('../models/Url');
const UrlService = require('../services/UrlService');
const AnalyticsService = require('../services/AnalyticsService');
const ClickEvent = require('../models/ClickEvent');
const { errorHandler } = require('../middleware');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/', urlRoutes);
// Add error handler middleware
app.use(errorHandler);

// Mock database storage
let savedUrls = new Map();
let savedClickEvents = [];

// Get reference to rate limiter for cleanup
const { createRateLimiter } = require('../middleware/rateLimiter');
let rateLimiterInstance;

beforeAll(() => {
  // Create rate limiter instance for cleanup
  rateLimiterInstance = createRateLimiter();
});

afterAll(() => {
  // Stop rate limiter cleanup interval to prevent Jest from hanging
  if (rateLimiterInstance) {
    rateLimiterInstance.stop();
  }
});

beforeEach(() => {
  savedUrls.clear();
  savedClickEvents = [];

  // Reset rate limiter between tests
  if (rateLimiterInstance) {
    rateLimiterInstance.reset();
  }

  // Mock Url.create
  Url.create = jest.fn(async (data) => {
    const urlDoc = {
      shortCode: data.shortCode,
      originalUrl: data.originalUrl,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      clicks: data.clicks || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      metadata: data.metadata || {},
      customCode: data.customCode || false,
      analytics: data.analytics || {
        totalClicks: 0,
        uniqueVisitors: 0,
        lastClickAt: null,
        topReferrers: [],
        clicksByDay: [],
      },
    };
    savedUrls.set(data.shortCode, urlDoc);
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

  // Mock Url.deleteOne
  Url.deleteOne = jest.fn(async ({ shortCode }) => {
    const existed = savedUrls.has(shortCode);
    savedUrls.delete(shortCode);
    return { deletedCount: existed ? 1 : 0 };
  });

  // Mock Url.deleteMany
  Url.deleteMany = jest.fn(async () => {
    const count = savedUrls.size;
    savedUrls.clear();
    return { deletedCount: count };
  });

  // Mock ClickEvent.create
  ClickEvent.create = jest.fn(async (data) => {
    const clickEvent = {
      shortCode: data.shortCode,
      timestamp: data.timestamp || new Date(),
      anonymizedIp: data.anonymizedIp,
      browser: data.browser,
      os: data.os,
      referrer: data.referrer,
    };
    savedClickEvents.push(clickEvent);
    return clickEvent;
  });

  // Mock ClickEvent.find
  ClickEvent.find = jest.fn(async (query) => {
    return savedClickEvents.filter((event) => {
      if (query.shortCode && event.shortCode !== query.shortCode) {
        return false;
      }
      return true;
    });
  });

  // Mock ClickEvent.countDocuments
  ClickEvent.countDocuments = jest.fn(async () => {
    return savedClickEvents.length;
  });

  // Mock AnalyticsService.recordClick
  jest.spyOn(AnalyticsService, 'recordClick').mockImplementation(async () => {
    // Mock implementation - just return
    return Promise.resolve();
  });
});

/**
 * **Feature: url-shortener, Property 5: Redirect behavior**
 * **Validates: Requirements 2.1**
 *
 * For any valid short code that exists in the database,
 * accessing the short URL should result in an HTTP 301 redirect
 * to the correct original URL.
 */
describe('Property 5: Redirect behavior', () => {
  test('should redirect to original URL with 301 status for any valid short code', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ validSchemes: ['http', 'https'] }),
        fc.stringOf(
          fc.constantFrom(
            ...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(
              ''
            )
          ),
          { minLength: 6, maxLength: 10 }
        ),
        async (originalUrl, shortCode) => {
          // Create URL mapping in database
          await Url.create({
            shortCode,
            originalUrl,
            isActive: true,
          });

          // Access the short URL
          const response = await request(app).get(`/${shortCode}`);

          // Verify 301 redirect to correct original URL
          expect(response.status).toBe(301);
          expect(response.headers.location).toBe(originalUrl);

          // Cleanup
          await Url.deleteOne({ shortCode });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: url-shortener, Property 7: Click counter increment**
 * **Validates: Requirements 2.3**
 *
 * For any valid short code, each redirect operation should increment
 * the click counter by exactly 1.
 */
describe('Property 7: Click counter increment', () => {
  test('should increment click counter by 1 for each redirect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl({ validSchemes: ['http', 'https'] }),
        fc.stringOf(
          fc.constantFrom(
            ...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(
              ''
            )
          ),
          { minLength: 6, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 10 }), // Initial click count
        fc.integer({ min: 1, max: 5 }), // Number of redirects to perform
        async (originalUrl, shortCode, initialClicks, numRedirects) => {
          // Create URL mapping with initial click count
          await Url.create({
            shortCode,
            originalUrl,
            isActive: true,
            clicks: initialClicks,
          });

          // Perform multiple redirects
          for (let i = 0; i < numRedirects; i++) {
            await request(app).get(`/${shortCode}`);
          }

          // Verify click counter increased by exactly numRedirects
          const urlData = await Url.findOne({ shortCode });
          expect(urlData.clicks).toBe(initialClicks + numRedirects);

          // Cleanup
          await Url.deleteOne({ shortCode });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: url-shortener, Property 6: Invalid short code handling**
 * **Validates: Requirements 2.2, 3.2, 4.2**
 *
 * For any short code that does not exist in the database,
 * accessing it should return a 404 error response.
 */
describe('Property 6: Invalid short code handling', () => {
  test('should return 404 for non-existent short codes on redirect endpoint', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(
          fc.constantFrom(
            ...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(
              ''
            )
          ),
          { minLength: 6, maxLength: 10 }
        ),
        async (shortCode) => {
          // Ensure the short code doesn't exist in database
          const exists = await Url.findOne({ shortCode });
          fc.pre(!exists); // Skip if it happens to exist

          // Try to access the non-existent short URL
          const response = await request(app).get(`/${shortCode}`);

          // Verify 404 response
          expect(response.status).toBe(404);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should return 404 for non-existent short codes on info endpoint', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(
          fc.constantFrom(
            ...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(
              ''
            )
          ),
          { minLength: 6, maxLength: 10 }
        ),
        async (shortCode) => {
          // Ensure the short code doesn't exist in database
          const exists = await Url.findOne({ shortCode });
          fc.pre(!exists); // Skip if it happens to exist

          // Try to get info for non-existent short URL
          const response = await request(app).get(`/api/urls/${shortCode}`);

          // Verify 404 response
          expect(response.status).toBe(404);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should return 404 for non-existent short codes on delete endpoint', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(
          fc.constantFrom(
            ...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(
              ''
            )
          ),
          { minLength: 6, maxLength: 10 }
        ),
        async (shortCode) => {
          // Ensure the short code doesn't exist in database
          const exists = await Url.findOne({ shortCode });
          fc.pre(!exists); // Skip if it happens to exist

          // Try to delete non-existent short URL
          const response = await request(app).delete(`/api/urls/${shortCode}`);

          // Verify 404 response
          expect(response.status).toBe(404);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
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
        customCode: 'my-custom-link',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shortCode).toBe('my-custom-link');
      expect(response.body.data.originalUrl).toBe('https://example.com');
    });

    test('should reject duplicate custom code', async () => {
      // Create first URL with custom code
      await request(app).post('/api/shorten').send({
        url: 'https://example.com',
        customCode: 'duplicate-code',
      });

      // Try to create second URL with same custom code
      const response = await request(app).post('/api/shorten').send({
        url: 'https://another-example.com',
        customCode: 'duplicate-code',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already in use');
    });

    test('should reject invalid custom code characters', async () => {
      const response = await request(app).post('/api/shorten').send({
        url: 'https://example.com',
        customCode: 'invalid@code!',
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
        customCode: 'MyCustomLink',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.shortCode).toBe('mycustomlink');
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
      await Url.create({
        shortCode: 'test-analytics',
        originalUrl: 'https://example.com',
        isActive: true,
      });

      // Access the short URL
      const response = await request(app)
        .get('/test-analytics')
        .set('User-Agent', 'Mozilla/5.0 Chrome/91.0')
        .set('Referer', 'https://google.com');

      // Should redirect immediately
      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('https://example.com');

      // Analytics should be called (mocked)
      // Wait a bit for setImmediate to execute
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(AnalyticsService.recordClick).toHaveBeenCalledWith(
        'test-analytics',
        expect.objectContaining({
          userAgent: expect.stringContaining('Chrome'),
          referrer: 'https://google.com',
        })
      );
    });

    test('should not record analytics for non-existent short code', async () => {
      const response = await request(app).get('/non-existent-code');

      expect(response.status).toBe(404);
      expect(AnalyticsService.recordClick).not.toHaveBeenCalled();
    });

    test('should not apply rate limiting to redirects', async () => {
      // Create a URL
      await Url.create({
        shortCode: 'no-rate-limit',
        originalUrl: 'https://example.com',
        isActive: true,
      });

      // Make many redirect requests (more than rate limit)
      for (let i = 0; i < 15; i++) {
        const response = await request(app).get('/no-rate-limit');
        expect(response.status).toBe(301);
      }

      // All should succeed - no rate limiting on redirects
    });
  });

  /**
   * Test URL info with analytics summary
   * Requirements: 5.1
   */
  describe('GET /api/urls/:shortcode with analytics', () => {
    test('should return URL info with analytics summary', async () => {
      // Create a URL with analytics data
      await Url.create({
        shortCode: 'test-info',
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

      const response = await request(app).get('/api/urls/test-info');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shortCode).toBe('test-info');
      expect(response.body.data.originalUrl).toBe('https://example.com');
      expect(response.body.data.analytics).toBeDefined();
      expect(response.body.data.analytics.totalClicks).toBe(42);
      expect(response.body.data.analytics.uniqueVisitors).toBe(28);
      expect(response.body.data.analytics.topReferrers).toHaveLength(2);
      expect(response.body.data.analytics.clicksByDay).toHaveLength(2);
    });

    test('should return default analytics for URL without analytics data', async () => {
      // Create a URL without analytics
      await Url.create({
        shortCode: 'no-analytics',
        originalUrl: 'https://example.com',
        isActive: true,
      });

      const response = await request(app).get('/api/urls/no-analytics');

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
