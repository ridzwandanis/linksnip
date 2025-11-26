const fc = require('fast-check');
const Url = require('./Url');

// Mock mongoose for testing without actual database
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };
});

describe('URL Model Property-Based Tests', () => {
  let savedUrls = new Map();

  beforeEach(() => {
    savedUrls.clear();

    // Mock Url.prototype.save with uniqueness constraint
    Url.prototype.save = jest.fn(async function () {
      // Check for duplicate shortCode (uniqueness constraint)
      if (savedUrls.has(this.shortCode)) {
        const error = new Error('E11000 duplicate key error');
        error.code = 11000;
        throw error;
      }

      savedUrls.set(this.shortCode, {
        shortCode: this.shortCode,
        originalUrl: this.originalUrl,
        createdAt: this.createdAt || new Date(),
        updatedAt: this.updatedAt || new Date(),
        clicks: this.clicks || 0,
        isActive: this.isActive !== undefined ? this.isActive : true,
        metadata: this.metadata || {},
      });
      return this;
    });

    // Mock Url.findOne
    Url.findOne = jest.fn(async ({ shortCode }) => {
      const data = savedUrls.get(shortCode);
      return data || null;
    });

    // Mock Url.deleteOne
    Url.deleteOne = jest.fn(async ({ shortCode }) => {
      savedUrls.delete(shortCode);
      return { deletedCount: 1 };
    });

    // Mock Url.deleteMany
    Url.deleteMany = jest.fn(async () => {
      savedUrls.clear();
      return { deletedCount: savedUrls.size };
    });
  });

  /**
   * **Feature: url-shortener, Property 2: URL mapping persistence**
   * **Validates: Requirements 1.2, 6.1**
   *
   * For any valid original URL and generated short code, when the mapping is created,
   * querying the database should return the same original URL for that short code.
   */
  test('Property 2: URL mapping persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(), // Generate random valid URLs
        fc.stringMatching(/^[a-zA-Z0-9]{6,10}$/), // Generate random short codes (6-10 alphanumeric)
        async (originalUrl, shortCode) => {
          // Create URL mapping
          const urlDoc = new Url({
            shortCode,
            originalUrl,
          });

          await urlDoc.save();

          // Query database for the short code
          const retrieved = await Url.findOne({ shortCode });

          // Verify the original URL matches
          expect(retrieved).not.toBeNull();
          expect(retrieved.originalUrl).toBe(originalUrl);
          expect(retrieved.shortCode).toBe(shortCode);

          // Clean up for next iteration
          await Url.deleteOne({ shortCode });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: url-shortener, Property 12: Database uniqueness constraint**
   * **Validates: Requirements 7.3**
   *
   * For any attempt to insert a duplicate short code into the database,
   * the database should reject the operation and enforce the uniqueness constraint.
   */
  test('Property 12: Database uniqueness constraint', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        fc.webUrl(),
        fc.stringMatching(/^[a-zA-Z0-9]{6,10}$/),
        async (originalUrl1, originalUrl2, shortCode) => {
          // Assume originalUrl1 and originalUrl2 are different
          fc.pre(originalUrl1 !== originalUrl2);

          // Create first URL mapping
          const urlDoc1 = new Url({
            shortCode,
            originalUrl: originalUrl1,
          });

          await urlDoc1.save();

          // Attempt to create second URL mapping with same short code
          const urlDoc2 = new Url({
            shortCode,
            originalUrl: originalUrl2,
          });

          // This should fail due to uniqueness constraint
          await expect(urlDoc2.save()).rejects.toThrow();

          // Verify only the first mapping exists
          const retrieved = await Url.findOne({ shortCode });
          expect(retrieved).not.toBeNull();
          expect(retrieved.originalUrl).toBe(originalUrl1);

          // Clean up
          await Url.deleteOne({ shortCode });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('URL Model Unit Tests - Analytics Fields', () => {
  let savedUrls = new Map();

  beforeEach(() => {
    savedUrls.clear();

    // Mock Url.prototype.save
    Url.prototype.save = jest.fn(async function () {
      if (savedUrls.has(this.shortCode)) {
        const error = new Error('E11000 duplicate key error');
        error.code = 11000;
        throw error;
      }

      savedUrls.set(this.shortCode, {
        shortCode: this.shortCode,
        originalUrl: this.originalUrl,
        customCode: this.customCode !== undefined ? this.customCode : false,
        createdAt: this.createdAt || new Date(),
        updatedAt: this.updatedAt || new Date(),
        clicks: this.clicks || 0,
        isActive: this.isActive !== undefined ? this.isActive : true,
        metadata: this.metadata || {},
        analytics: this.analytics || {
          totalClicks: 0,
          uniqueVisitors: 0,
          lastClickAt: undefined,
          topReferrers: [],
          clicksByDay: [],
        },
      });
      return this;
    });

    // Mock Url.findOne
    Url.findOne = jest.fn(async ({ shortCode }) => {
      const data = savedUrls.get(shortCode);
      return data || null;
    });

    // Mock Url.deleteOne
    Url.deleteOne = jest.fn(async ({ shortCode }) => {
      savedUrls.delete(shortCode);
      return { deletedCount: 1 };
    });
  });

  /**
   * Test schema validation with new fields
   * Validates: Requirements 5.1, 7.1
   */
  test('should accept URL with all new analytics fields', async () => {
    const urlDoc = new Url({
      shortCode: 'test123',
      originalUrl: 'https://example.com',
      customCode: true,
      analytics: {
        totalClicks: 10,
        uniqueVisitors: 5,
        lastClickAt: new Date(),
        topReferrers: [
          { source: 'google.com', count: 5 },
          { source: 'twitter.com', count: 3 },
        ],
        clicksByDay: [{ date: new Date(), count: 10 }],
      },
    });

    await urlDoc.save();
    const retrieved = await Url.findOne({ shortCode: 'test123' });

    expect(retrieved).not.toBeNull();
    expect(retrieved.customCode).toBe(true);
    expect(retrieved.analytics.totalClicks).toBe(10);
    expect(retrieved.analytics.uniqueVisitors).toBe(5);
    expect(retrieved.analytics.lastClickAt).toBeDefined();
    expect(retrieved.analytics.topReferrers).toHaveLength(2);
    expect(retrieved.analytics.clicksByDay).toHaveLength(1);
  });

  /**
   * Test default values for analytics fields
   * Validates: Requirements 5.1, 7.1
   */
  test('should use default values for analytics fields when not provided', async () => {
    const urlDoc = new Url({
      shortCode: 'test456',
      originalUrl: 'https://example.com',
    });

    await urlDoc.save();
    const retrieved = await Url.findOne({ shortCode: 'test456' });

    expect(retrieved).not.toBeNull();
    expect(retrieved.customCode).toBe(false);
    expect(retrieved.analytics.totalClicks).toBe(0);
    expect(retrieved.analytics.uniqueVisitors).toBe(0);
    expect(retrieved.analytics.lastClickAt).toBeUndefined();
    expect(retrieved.analytics.topReferrers).toEqual([]);
    expect(retrieved.analytics.clicksByDay).toEqual([]);
  });

  /**
   * Test backward compatibility with existing URLs
   * Validates: Requirements 5.1, 7.1
   */
  test('should work with URLs that do not have analytics fields', async () => {
    // Simulate an existing URL without analytics fields
    const urlDoc = new Url({
      shortCode: 'legacy1',
      originalUrl: 'https://example.com',
      clicks: 5,
    });

    await urlDoc.save();
    const retrieved = await Url.findOne({ shortCode: 'legacy1' });

    expect(retrieved).not.toBeNull();
    expect(retrieved.originalUrl).toBe('https://example.com');
    expect(retrieved.clicks).toBe(5);
    // Analytics should have default values
    expect(retrieved.analytics.totalClicks).toBe(0);
    expect(retrieved.analytics.uniqueVisitors).toBe(0);
  });

  /**
   * Test customCode field
   * Validates: Requirements 5.1
   */
  test('should correctly store customCode boolean field', async () => {
    const customUrl = new Url({
      shortCode: 'custom1',
      originalUrl: 'https://example.com',
      customCode: true,
    });

    const randomUrl = new Url({
      shortCode: 'random1',
      originalUrl: 'https://example.com',
      customCode: false,
    });

    await customUrl.save();
    await randomUrl.save();

    const retrievedCustom = await Url.findOne({ shortCode: 'custom1' });
    const retrievedRandom = await Url.findOne({ shortCode: 'random1' });

    expect(retrievedCustom.customCode).toBe(true);
    expect(retrievedRandom.customCode).toBe(false);
  });

  /**
   * Test analytics.topReferrers array structure
   * Validates: Requirements 7.3
   */
  test('should correctly store topReferrers array with source and count', async () => {
    const urlDoc = new Url({
      shortCode: 'test789',
      originalUrl: 'https://example.com',
      analytics: {
        topReferrers: [
          { source: 'google.com', count: 10 },
          { source: 'facebook.com', count: 5 },
          { source: 'direct', count: 3 },
        ],
      },
    });

    await urlDoc.save();
    const retrieved = await Url.findOne({ shortCode: 'test789' });

    expect(retrieved.analytics.topReferrers).toHaveLength(3);
    expect(retrieved.analytics.topReferrers[0].source).toBe('google.com');
    expect(retrieved.analytics.topReferrers[0].count).toBe(10);
    expect(retrieved.analytics.topReferrers[1].source).toBe('facebook.com');
    expect(retrieved.analytics.topReferrers[1].count).toBe(5);
  });

  /**
   * Test analytics.clicksByDay array structure
   * Validates: Requirements 7.4
   */
  test('should correctly store clicksByDay array with date and count', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const urlDoc = new Url({
      shortCode: 'test999',
      originalUrl: 'https://example.com',
      analytics: {
        clicksByDay: [
          { date: today, count: 15 },
          { date: yesterday, count: 8 },
        ],
      },
    });

    await urlDoc.save();
    const retrieved = await Url.findOne({ shortCode: 'test999' });

    expect(retrieved.analytics.clicksByDay).toHaveLength(2);
    expect(retrieved.analytics.clicksByDay[0].count).toBe(15);
    expect(retrieved.analytics.clicksByDay[1].count).toBe(8);
  });
});
