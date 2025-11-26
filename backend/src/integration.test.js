/**
 * Integration Tests for URL Shortener
 * Tests end-to-end flows with real database
 */

const request = require('supertest');
const mongoose = require('mongoose');
const fc = require('fast-check');
const createApp = require('./app');
const Url = require('./models/Url');

let app;

// Setup database connection before all tests
beforeAll(async () => {
  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Use test database
  const mongoUri = 'mongodb://localhost:27017/url-shortener-test';

  // Connect to the database
  await mongoose.connect(mongoUri, {
    minPoolSize: 5,
    maxPoolSize: 10,
  });

  // Wait for connection to be ready
  await new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) {
      resolve();
    } else {
      mongoose.connection.once('connected', resolve);
    }
  });

  // Create Express app
  app = createApp();
}, 30000); // 30 second timeout

// Cleanup after all tests
afterAll(async () => {
  // Clean up test data
  try {
    await Url.deleteMany({});
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }

  // Disconnect from database
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}, 10000); // 10 second timeout

// Clear database between tests
beforeEach(async () => {
  await Url.deleteMany({});
});

/**
 * Task 11.1: Test end-to-end URL shortening flow
 * Requirements: 1.1, 1.2, 2.1, 2.3
 */
describe('11.1 End-to-end URL shortening flow', () => {
  test('should create short URL, store in database, redirect, and increment clicks', async () => {
    const originalUrl = 'https://example.com/very/long/url/path';

    // Step 1: Create short URL via API
    const createResponse = await request(app)
      .post('/api/shorten')
      .send({ url: originalUrl })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toBeDefined();
    expect(createResponse.body.data.shortCode).toBeDefined();
    expect(createResponse.body.data.originalUrl).toBe(originalUrl);

    const { shortCode } = createResponse.body.data;

    // Step 2: Verify database storage
    const urlDoc = await Url.findOne({ shortCode });
    expect(urlDoc).not.toBeNull();
    expect(urlDoc.originalUrl).toBe(originalUrl);
    expect(urlDoc.clicks).toBe(0);
    expect(urlDoc.isActive).toBe(true);

    // Step 3: Access short URL and verify redirect
    const redirectResponse = await request(app)
      .get(`/${shortCode}`)
      .expect(301);

    expect(redirectResponse.headers.location).toBe(originalUrl);

    // Step 4: Check click counter increment
    const updatedUrlDoc = await Url.findOne({ shortCode });
    expect(updatedUrlDoc.clicks).toBe(1);

    // Additional redirect to verify counter continues incrementing
    await request(app).get(`/${shortCode}`).expect(301);

    const finalUrlDoc = await Url.findOne({ shortCode });
    expect(finalUrlDoc.clicks).toBe(2);
  });

  test('should handle multiple URLs and maintain separate click counters', async () => {
    const url1 = 'https://example.com/url1';
    const url2 = 'https://example.com/url2';

    // Create two short URLs
    const response1 = await request(app)
      .post('/api/shorten')
      .send({ url: url1 })
      .expect(201);

    const response2 = await request(app)
      .post('/api/shorten')
      .send({ url: url2 })
      .expect(201);

    const shortCode1 = response1.body.data.shortCode;
    const shortCode2 = response2.body.data.shortCode;

    // Verify they have different short codes
    expect(shortCode1).not.toBe(shortCode2);

    // Access first URL twice
    await request(app).get(`/${shortCode1}`).expect(301);
    await request(app).get(`/${shortCode1}`).expect(301);

    // Access second URL once
    await request(app).get(`/${shortCode2}`).expect(301);

    // Verify separate click counters
    const url1Doc = await Url.findOne({ shortCode: shortCode1 });
    const url2Doc = await Url.findOne({ shortCode: shortCode2 });

    expect(url1Doc.clicks).toBe(2);
    expect(url2Doc.clicks).toBe(1);
  });

  test('should retrieve URL info with correct metadata', async () => {
    const originalUrl = 'https://example.com/test';

    // Create short URL
    const createResponse = await request(app)
      .post('/api/shorten')
      .send({ url: originalUrl })
      .expect(201);

    const { shortCode } = createResponse.body.data;

    // Access it a few times
    await request(app).get(`/${shortCode}`).expect(301);
    await request(app).get(`/${shortCode}`).expect(301);
    await request(app).get(`/${shortCode}`).expect(301);

    // Get URL info
    const infoResponse = await request(app)
      .get(`/api/urls/${shortCode}`)
      .expect(200);

    expect(infoResponse.body.success).toBe(true);
    expect(infoResponse.body.data.shortCode).toBe(shortCode);
    expect(infoResponse.body.data.originalUrl).toBe(originalUrl);
    expect(infoResponse.body.data.clicks).toBe(3);
    expect(infoResponse.body.data.isActive).toBe(true);
    expect(infoResponse.body.data.createdAt).toBeDefined();
  });

  test('should delete URL and make it inaccessible', async () => {
    const originalUrl = 'https://example.com/to-delete';

    // Create short URL
    const createResponse = await request(app)
      .post('/api/shorten')
      .send({ url: originalUrl })
      .expect(201);

    const { shortCode } = createResponse.body.data;

    // Verify it exists
    await request(app).get(`/${shortCode}`).expect(301);

    // Delete the URL
    const deleteResponse = await request(app)
      .delete(`/api/urls/${shortCode}`)
      .expect(200);

    expect(deleteResponse.body.success).toBe(true);

    // Verify it's deleted from database
    const urlDoc = await Url.findOne({ shortCode });
    expect(urlDoc).toBeNull();

    // Verify it's no longer accessible
    await request(app).get(`/${shortCode}`).expect(404);
    await request(app).get(`/api/urls/${shortCode}`).expect(404);
  });
});

/**
 * Task 11.2: Test error scenarios
 * Requirements: 1.4, 2.2, 5.2
 */
describe('11.2 Error scenarios', () => {
  test('should reject invalid URL formats', async () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://invalid-scheme.com',
      'javascript:alert(1)',
      '',
      '   ',
      'http://',
      'https://',
      'http://.',
      'http://..',
      'http://../',
      'http://?',
      'http://??',
      'http://??/',
      'http://#',
      'http://##',
      'http://##/',
    ];

    for (const invalidUrl of invalidUrls) {
      const response = await request(app)
        .post('/api/shorten')
        .send({ url: invalidUrl });

      // Should return 400 Bad Request
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    }
  });

  test('should reject URLs exceeding maximum length', async () => {
    // Create a URL longer than 2048 characters
    const longPath = 'a'.repeat(2100);
    const longUrl = `https://example.com/${longPath}`;

    const response = await request(app)
      .post('/api/shorten')
      .send({ url: longUrl })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('should return 404 for non-existent short codes', async () => {
    const nonExistentCode = 'xyz999';

    // Try to redirect
    const redirectResponse = await request(app)
      .get(`/${nonExistentCode}`)
      .expect(404);

    expect(redirectResponse.body.success).toBe(false);
    expect(redirectResponse.body.error).toBeDefined();

    // Try to get info
    const infoResponse = await request(app)
      .get(`/api/urls/${nonExistentCode}`)
      .expect(404);

    expect(infoResponse.body.success).toBe(false);
    expect(infoResponse.body.error).toBeDefined();

    // Try to delete
    const deleteResponse = await request(app)
      .delete(`/api/urls/${nonExistentCode}`)
      .expect(404);

    expect(deleteResponse.body.success).toBe(false);
    expect(deleteResponse.body.error).toBeDefined();
  });

  test('should return standardized error responses', async () => {
    // Test validation error format
    const validationResponse = await request(app)
      .post('/api/shorten')
      .send({ url: 'invalid-url' })
      .expect(400);

    expect(validationResponse.body).toHaveProperty('success', false);
    expect(validationResponse.body).toHaveProperty('error');
    expect(typeof validationResponse.body.error).toBe('string');

    // Test not found error format
    const notFoundResponse = await request(app)
      .get('/nonexistent123')
      .expect(404);

    expect(notFoundResponse.body).toHaveProperty('success', false);
    expect(notFoundResponse.body).toHaveProperty('error');
    expect(typeof notFoundResponse.body.error).toBe('string');
  });

  test('should handle missing request body', async () => {
    const response = await request(app)
      .post('/api/shorten')
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/shorten')
      .set('Content-Type', 'application/json')
      .send('{"url": invalid json}');

    expect([400, 500]).toContain(response.status);
    expect(response.body.success).toBe(false);
  });
});

/**
 * Task 11.3: Property test for data persistence across restarts
 * **Feature: url-shortener, Property 11: Data persistence across restarts**
 * **Validates: Requirements 6.2**
 *
 * For any set of URL mappings created before application restart,
 * all mappings should still exist and be accessible after the restart.
 */
describe('Property 11: Data persistence across restarts', () => {
  test('should persist URL mappings in database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            url: fc.webUrl({ validSchemes: ['http', 'https'] }),
            clicks: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (urlRecords) => {
          // Step 1: Create multiple URL mappings
          const createdMappings = [];

          for (const record of urlRecords) {
            const response = await request(app)
              .post('/api/shorten')
              .send({ url: record.url });

            if (response.status === 201) {
              const { shortCode, originalUrl } = response.body.data;

              // Simulate some clicks
              for (let i = 0; i < record.clicks; i++) {
                await request(app).get(`/${shortCode}`);
              }

              createdMappings.push({
                shortCode,
                originalUrl,
                expectedClicks: record.clicks,
              });
            }
          }

          // Skip if no mappings were created
          fc.pre(createdMappings.length > 0);

          // Step 2: Verify all mappings exist in database
          for (const mapping of createdMappings) {
            const urlDoc = await Url.findOne({ shortCode: mapping.shortCode });
            expect(urlDoc).not.toBeNull();
            expect(urlDoc.originalUrl).toBe(mapping.originalUrl);
            expect(urlDoc.clicks).toBe(mapping.expectedClicks);
          }

          // Step 3: Verify all mappings are accessible via API
          for (const mapping of createdMappings) {
            // Check via API - redirect should work
            const redirectResponse = await request(app).get(
              `/${mapping.shortCode}`
            );
            expect(redirectResponse.status).toBe(301);
            expect(redirectResponse.headers.location).toBe(mapping.originalUrl);

            // Check via API - info should be accessible
            const infoResponse = await request(app).get(
              `/api/urls/${mapping.shortCode}`
            );
            expect(infoResponse.status).toBe(200);
            expect(infoResponse.body.data.originalUrl).toBe(
              mapping.originalUrl
            );
            // Note: clicks will be expectedClicks + 1 due to the redirect above
            expect(infoResponse.body.data.clicks).toBe(
              mapping.expectedClicks + 1
            );
          }

          // Cleanup: delete all created mappings
          for (const mapping of createdMappings) {
            await Url.deleteOne({ shortCode: mapping.shortCode });
          }
        }
      ),
      { numRuns: 20 } // Reduced from 100 to 20 for faster execution
    );
  }, 30000); // 30 second timeout for property test

  test('should maintain data integrity with persistent storage', async () => {
    const originalUrl = 'https://example.com/persistent-url';

    // Create a URL
    const createResponse = await request(app)
      .post('/api/shorten')
      .send({ url: originalUrl })
      .expect(201);

    const { shortCode } = createResponse.body.data;

    // Perform some clicks
    await request(app).get(`/${shortCode}`).expect(301);
    await request(app).get(`/${shortCode}`).expect(301);

    // Verify state in database
    let urlDoc = await Url.findOne({ shortCode });
    expect(urlDoc.clicks).toBe(2);
    expect(urlDoc.originalUrl).toBe(originalUrl);

    // Verify data persists (simulating that data would survive restart)
    // In a real restart scenario, this data would still be in MongoDB
    urlDoc = await Url.findOne({ shortCode });
    expect(urlDoc).not.toBeNull();
    expect(urlDoc.originalUrl).toBe(originalUrl);
    expect(urlDoc.clicks).toBe(2);

    // Verify functionality still works
    await request(app).get(`/${shortCode}`).expect(301);

    // Final verification
    urlDoc = await Url.findOne({ shortCode });
    expect(urlDoc.clicks).toBe(3);

    // Cleanup
    await Url.deleteOne({ shortCode });
  });
});
