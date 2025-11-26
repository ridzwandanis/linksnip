const fc = require('fast-check');
const mongoose = require('mongoose');
const AnalyticsService = require('./AnalyticsService');
const ClickEvent = require('../models/ClickEvent');
const Url = require('../models/Url');

let testCounter = 0;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/url-shortener-test';
    await mongoose.connect(mongoUri);
  }
});

afterAll(async () => {
  await ClickEvent.deleteMany({});
  await Url.deleteMany({});
  await mongoose.connection.close();
});

beforeEach(async () => {
  await ClickEvent.deleteMany({});
  await Url.deleteMany({});
  testCounter = 0;
});

describe('AnalyticsService - Property-Based Tests', () => {
  /**
   * Feature: url-enhancements, Property 14: Click event recording
   * Validates: Requirements 5.1
   */
  test('Property 14: Click event recording', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.oneof(
          fc.webUrl(),
          fc.constant(''),
          fc.constant(null),
          fc.constant(undefined)
        ),
        async (ip, userAgent, referrer) => {
          const shortCode = `test${String(testCounter++).padStart(6, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          await AnalyticsService.recordClick(shortCode, {
            ip,
            userAgent,
            referrer,
          });

          const clickEvents = await ClickEvent.find({ shortCode });
          expect(clickEvents.length).toBeGreaterThan(0);

          const clickEvent = clickEvents[0];
          expect(clickEvent.shortCode).toBe(shortCode);
          expect(clickEvent.timestamp).toBeInstanceOf(Date);
          expect(clickEvent.anonymizedIp).toBeDefined();
          expect(clickEvent.browser).toBeDefined();
          expect(clickEvent.os).toBeDefined();
          expect(clickEvent.referrer).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 15: Async analytics recording
   * Validates: Requirements 5.2
   */
  test('Property 15: Async analytics recording', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.oneof(fc.webUrl(), fc.constant('')),
        async (ip, userAgent, referrer) => {
          const shortCode = `async${String(testCounter++).padStart(5, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          const startTime = Date.now();
          await AnalyticsService.recordClick(shortCode, {
            ip,
            userAgent,
            referrer,
          });
          const duration = Date.now() - startTime;

          expect(duration).toBeLessThan(5000);

          const clickEvents = await ClickEvent.find({ shortCode });
          expect(clickEvents.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 16: Click event association
   * Validates: Requirements 5.3
   */
  test('Property 16: Click event association', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.oneof(fc.webUrl(), fc.constant(''), fc.constant(null)),
        fc.webUrl(),
        async (ip, userAgent, referrer, originalUrl) => {
          // Create a unique short code for this test iteration
          const shortCode = `assoc${String(testCounter++).padStart(5, '0')}`;

          // Create URL mapping
          const url = new Url({
            shortCode,
            originalUrl,
            customCode: false,
          });
          await url.save();

          // Record a click event
          await AnalyticsService.recordClick(shortCode, {
            ip,
            userAgent,
            referrer,
          });

          // Verify click event is associated with the correct URL mapping
          const clickEvents = await ClickEvent.find({ shortCode });
          expect(clickEvents.length).toBeGreaterThan(0);

          // Verify all click events have the correct shortCode
          for (const clickEvent of clickEvents) {
            expect(clickEvent.shortCode).toBe(shortCode);
          }

          // Verify we can find the URL mapping using the shortCode from click event
          const foundUrl = await Url.findOne({
            shortCode: clickEvents[0].shortCode,
          });
          expect(foundUrl).not.toBeNull();
          expect(foundUrl.shortCode).toBe(shortCode);
          expect(foundUrl.originalUrl).toBe(originalUrl);

          // Verify the association is bidirectional - we can query click events by URL's shortCode
          const clickEventsForUrl = await ClickEvent.find({
            shortCode: foundUrl.shortCode,
          });
          expect(clickEventsForUrl.length).toBeGreaterThan(0);
          expect(clickEventsForUrl[0].shortCode).toBe(foundUrl.shortCode);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 17: IP address anonymization
   * Validates: Requirements 5.4
   */
  test('Property 17: IP address anonymization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.oneof(fc.webUrl(), fc.constant('')),
        async (ip, userAgent, referrer) => {
          const shortCode = `anon${String(testCounter++).padStart(5, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          // Record a click event with the IP address
          await AnalyticsService.recordClick(shortCode, {
            ip,
            userAgent,
            referrer,
          });

          // Retrieve the click event
          const clickEvents = await ClickEvent.find({ shortCode });
          expect(clickEvents.length).toBeGreaterThan(0);

          const clickEvent = clickEvents[0];
          const anonymizedIp = clickEvent.anonymizedIp;

          // Verify IPv4 anonymization: last octet should be masked with "xxx"
          const ipParts = ip.split('.');
          if (ipParts.length === 4) {
            const expectedAnonymized = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.xxx`;
            expect(anonymizedIp).toBe(expectedAnonymized);

            // Verify the last octet is actually masked
            expect(anonymizedIp).toMatch(/^\d+\.\d+\.\d+\.xxx$/);

            // Verify the first three octets are preserved
            expect(
              anonymizedIp.startsWith(
                `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.`
              )
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 18: No analytics for failed redirects
   * Validates: Requirements 5.5
   */
  test('Property 18: No analytics for failed redirects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 3, maxLength: 20 })
          .filter((code) => /^[a-zA-Z0-9-]+$/.test(code)),
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.oneof(fc.webUrl(), fc.constant(''), fc.constant(null)),
        async (nonExistentShortCode, ip, userAgent, referrer) => {
          // Ensure the short code doesn't exist in the database
          const existingUrl = await Url.findOne({
            shortCode: nonExistentShortCode,
          });
          if (existingUrl) {
            // Skip this iteration if the short code happens to exist
            return;
          }

          // Count click events before attempting to record
          const clickEventsBefore = await ClickEvent.countDocuments({
            shortCode: nonExistentShortCode,
          });

          // Attempt to record a click for a non-existent short code
          await AnalyticsService.recordClick(nonExistentShortCode, {
            ip,
            userAgent,
            referrer,
          });

          // Verify no click event was recorded
          const clickEventsAfter = await ClickEvent.countDocuments({
            shortCode: nonExistentShortCode,
          });
          expect(clickEventsAfter).toBe(clickEventsBefore);
          expect(clickEventsAfter).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 19: User agent parsing
   * Validates: Requirements 8.2
   */
  test('Property 19: User agent parsing', async () => {
    // Generator for realistic user agent strings
    const userAgentGen = fc.oneof(
      // Chrome on Windows
      fc.constant(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ),
      // Firefox on macOS
      fc.constant(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
      ),
      // Safari on macOS
      fc.constant(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
      ),
      // Edge on Windows
      fc.constant(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
      ),
      // Chrome on Android
      fc.constant(
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      ),
      // Safari on iOS
      fc.constant(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
      ),
      // Firefox on Linux
      fc.constant(
        'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
      ),
      // Opera on Windows
      fc.constant(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0'
      ),
      // Empty user agent
      fc.constant(''),
      // Null/undefined
      fc.constant(null)
    );

    await fc.assert(
      fc.asyncProperty(
        userAgentGen,
        fc.ipV4(),
        fc.oneof(fc.webUrl(), fc.constant('')),
        async (userAgent, ip, referrer) => {
          const shortCode = `ua${String(testCounter++).padStart(6, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          // Record a click event with the user agent
          await AnalyticsService.recordClick(shortCode, {
            ip,
            userAgent,
            referrer,
          });

          // Retrieve the click event
          const clickEvents = await ClickEvent.find({ shortCode });
          expect(clickEvents.length).toBeGreaterThan(0);

          const clickEvent = clickEvents[0];

          // Verify that only browser and OS are stored, not the full user agent string
          expect(clickEvent.browser).toBeDefined();
          expect(clickEvent.os).toBeDefined();

          // Verify that the stored values are simplified (not the full user agent string)
          if (userAgent && userAgent.length > 0) {
            // Browser should be a simple name, not the full user agent
            expect(clickEvent.browser.length).toBeLessThan(20);
            expect(clickEvent.browser).not.toContain('Mozilla');
            expect(clickEvent.browser).not.toContain('AppleWebKit');
            expect(clickEvent.browser).not.toContain('KHTML');

            // OS should be a simple name, not the full user agent
            expect(clickEvent.os.length).toBeLessThan(20);
            expect(clickEvent.os).not.toContain('Mozilla');
            expect(clickEvent.os).not.toContain('AppleWebKit');

            // Verify browser is one of the expected values
            const validBrowsers = [
              'Chrome',
              'Firefox',
              'Safari',
              'Edge',
              'Opera',
              'Unknown',
            ];
            expect(validBrowsers).toContain(clickEvent.browser);

            // Verify OS is one of the expected values
            const validOS = [
              'Windows',
              'macOS',
              'Linux',
              'Android',
              'iOS',
              'Unknown',
            ];
            expect(validOS).toContain(clickEvent.os);
          } else {
            // For empty or null user agents, should default to "Unknown"
            expect(clickEvent.browser).toBe('Unknown');
            expect(clickEvent.os).toBe('Unknown');
          }

          // Verify the full user agent string is NOT stored in the click event
          expect(clickEvent.userAgent).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 20: Aggregated counter updates
   * Validates: Requirements 7.1
   */
  test('Property 20: Aggregated counter updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.oneof(fc.webUrl(), fc.constant(''), fc.constant(null)),
        fc.integer({ min: 1, max: 10 }),
        async (ip, userAgent, referrer, numClicks) => {
          const shortCode = `agg${String(testCounter++).padStart(6, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          // Get initial totalClicks count (should be 0)
          const initialUrl = await Url.findOne({ shortCode });
          const initialClicks = initialUrl.analytics.totalClicks || 0;

          // Record multiple click events
          for (let i = 0; i < numClicks; i++) {
            await AnalyticsService.recordClick(shortCode, {
              ip,
              userAgent,
              referrer,
            });
          }

          // Retrieve the updated URL document
          const updatedUrl = await Url.findOne({ shortCode });

          // Verify totalClicks counter was incremented for each click event
          expect(updatedUrl.analytics.totalClicks).toBe(
            initialClicks + numClicks
          );

          // Verify the counter matches the number of click events recorded
          const clickEventCount = await ClickEvent.countDocuments({
            shortCode,
          });
          expect(updatedUrl.analytics.totalClicks).toBe(clickEventCount);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 21: Unique visitor counting
   * Validates: Requirements 7.2
   */
  test('Property 21: Unique visitor counting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.ipV4(), { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.oneof(fc.webUrl(), fc.constant(''), fc.constant(null)),
        async (ipAddresses, userAgent, referrer) => {
          const shortCode = `uniq${String(testCounter++).padStart(6, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          // Record click events from multiple IP addresses
          for (const ip of ipAddresses) {
            await AnalyticsService.recordClick(shortCode, {
              ip,
              userAgent,
              referrer,
            });
          }

          // Retrieve the updated URL document
          const updatedUrl = await Url.findOne({ shortCode });

          // Get the actual unique anonymized IPs from click events
          const uniqueAnonymizedIps = await ClickEvent.distinct(
            'anonymizedIp',
            { shortCode }
          );

          // Verify uniqueVisitors count equals the number of distinct anonymized IP addresses
          expect(updatedUrl.analytics.uniqueVisitors).toBe(
            uniqueAnonymizedIps.length
          );

          // Verify the count is correct by comparing with the actual unique IPs
          // Count unique IPs manually by anonymizing the input IPs
          const anonymizedIps = new Set();
          for (const ip of ipAddresses) {
            const ipParts = ip.split('.');
            if (ipParts.length === 4) {
              const anonymized = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.xxx`;
              anonymizedIps.add(anonymized);
            }
          }

          // The uniqueVisitors count should match the number of unique anonymized IPs
          expect(updatedUrl.analytics.uniqueVisitors).toBe(anonymizedIps.size);

          // Verify uniqueVisitors is always <= totalClicks
          expect(updatedUrl.analytics.uniqueVisitors).toBeLessThanOrEqual(
            updatedUrl.analytics.totalClicks
          );
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 22: URL analytics response structure
   * Validates: Requirements 6.1, 6.2
   */
  test('Property 22: URL analytics response structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.ipV4(), { minLength: 1, maxLength: 20 }),
        fc.array(
          fc.record({
            userAgent: fc.oneof(
              fc.constant(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              ),
              fc.constant(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
              ),
              fc.constant('')
            ),
            referrer: fc.oneof(fc.webUrl(), fc.constant(''), fc.constant(null)),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (ipAddresses, clickData) => {
          const shortCode = `resp${String(testCounter++).padStart(6, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          // Record multiple click events
          for (let i = 0; i < clickData.length; i++) {
            const ip = ipAddresses[i % ipAddresses.length];
            await AnalyticsService.recordClick(shortCode, {
              ip,
              userAgent: clickData[i].userAgent,
              referrer: clickData[i].referrer,
            });
          }

          // Get analytics
          const analytics = await AnalyticsService.getUrlAnalytics(shortCode);

          // Verify response structure (Requirement 6.1, 6.2)
          expect(analytics).not.toBeNull();
          expect(analytics.shortCode).toBe(shortCode);
          expect(analytics.originalUrl).toBeDefined();
          expect(typeof analytics.totalClicks).toBe('number');
          expect(typeof analytics.uniqueVisitors).toBe('number');
          expect(Array.isArray(analytics.clickHistory)).toBe(true);
          expect(Array.isArray(analytics.topReferrers)).toBe(true);
          expect(Array.isArray(analytics.topBrowsers)).toBe(true);
          expect(Array.isArray(analytics.topOS)).toBe(true);

          // Verify totalClicks matches number of recorded clicks
          expect(analytics.totalClicks).toBe(clickData.length);

          // Verify uniqueVisitors is reasonable
          expect(analytics.uniqueVisitors).toBeGreaterThan(0);
          expect(analytics.uniqueVisitors).toBeLessThanOrEqual(
            analytics.totalClicks
          );
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 23: Time range filtering
   * Validates: Requirements 6.3
   */
  test('Property 23: Time range filtering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        async (ip, userAgent, clicksInRange, clicksOutOfRange) => {
          const shortCode = `time${String(testCounter++).padStart(6, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          const now = new Date();
          const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
          const endDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

          // Record clicks within the time range
          for (let i = 0; i < clicksInRange; i++) {
            const timestamp = new Date(
              startDate.getTime() +
                Math.random() * (endDate.getTime() - startDate.getTime())
            );
            const clickEvent = new ClickEvent({
              shortCode,
              timestamp,
              anonymizedIp: AnalyticsService._anonymizeIp(ip),
              browser: 'Chrome',
              os: 'Windows',
              referrer: 'direct',
            });
            await clickEvent.save();
          }

          // Record clicks outside the time range (before startDate)
          for (let i = 0; i < clicksOutOfRange; i++) {
            const timestamp = new Date(
              startDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000
            );
            const clickEvent = new ClickEvent({
              shortCode,
              timestamp,
              anonymizedIp: AnalyticsService._anonymizeIp(ip),
              browser: 'Chrome',
              os: 'Windows',
              referrer: 'direct',
            });
            await clickEvent.save();
          }

          // Get analytics with time range filter (Requirement 6.3)
          const analytics = await AnalyticsService.getUrlAnalytics(shortCode, {
            startDate,
            endDate,
          });

          // Verify only clicks within time range are included
          expect(analytics.totalClicks).toBe(clicksInRange);

          // Get analytics without time range filter
          const allAnalytics =
            await AnalyticsService.getUrlAnalytics(shortCode);

          // Verify all clicks are included without filter
          expect(allAnalytics.totalClicks).toBe(
            clicksInRange + clicksOutOfRange
          );
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 24: Analytics for non-existent URL
   * Validates: Requirements 6.4
   */
  test('Property 24: Analytics for non-existent URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 3, maxLength: 20 })
          .filter((code) => /^[a-zA-Z0-9-]+$/.test(code)),
        async (nonExistentShortCode) => {
          // Ensure the short code doesn't exist
          const existingUrl = await Url.findOne({
            shortCode: nonExistentShortCode,
          });
          if (existingUrl) {
            return; // Skip if it exists
          }

          // Get analytics for non-existent URL (Requirement 6.4)
          const analytics =
            await AnalyticsService.getUrlAnalytics(nonExistentShortCode);

          // Verify null is returned for non-existent URL
          expect(analytics).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 25: System-wide analytics
   * Validates: Requirements 6.5
   */
  test('Property 25: System-wide analytics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        async (numUrls, clicksPerUrl) => {
          // Create multiple URLs
          const shortCodes = [];
          for (let i = 0; i < numUrls; i++) {
            const shortCode = `sys${String(testCounter++).padStart(6, '0')}`;
            shortCodes.push(shortCode);
            const url = new Url({
              shortCode,
              originalUrl: `https://example${i}.com`,
              customCode: false,
            });
            await url.save();

            // Record clicks for each URL
            for (let j = 0; j < clicksPerUrl; j++) {
              await AnalyticsService.recordClick(shortCode, {
                ip: `192.168.1.${j}`,
                userAgent: 'Chrome',
                referrer: '',
              });
            }
          }

          // Get system-wide analytics (Requirement 6.5)
          const systemAnalytics = await AnalyticsService.getSystemAnalytics();

          // Verify response structure
          expect(systemAnalytics).not.toBeNull();
          expect(typeof systemAnalytics.totalUrls).toBe('number');
          expect(typeof systemAnalytics.totalClicks).toBe('number');
          expect(typeof systemAnalytics.uniqueVisitors).toBe('number');
          expect(Array.isArray(systemAnalytics.popularUrls)).toBe(true);

          // Verify totalUrls includes our created URLs
          expect(systemAnalytics.totalUrls).toBeGreaterThanOrEqual(numUrls);

          // Verify totalClicks includes our recorded clicks
          expect(systemAnalytics.totalClicks).toBeGreaterThanOrEqual(
            numUrls * clicksPerUrl
          );
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 26: Top referrers limit
   * Validates: Requirements 7.3
   */
  test('Property 26: Top referrers limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 11, max: 20 }),
        fc.ipV4(),
        async (numReferrers, ip) => {
          const shortCode = `ref${String(testCounter++).padStart(6, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          // Create click events directly with different referrers (more than 10)
          for (let i = 0; i < numReferrers; i++) {
            const clickEvent = new ClickEvent({
              shortCode,
              timestamp: new Date(),
              anonymizedIp: AnalyticsService._anonymizeIp(ip),
              browser: 'Chrome',
              os: 'Windows',
              referrer: `referrer${i}.com`,
            });
            await clickEvent.save();
          }

          // Get analytics
          const analytics = await AnalyticsService.getUrlAnalytics(shortCode);

          // Verify top referrers is limited to 10 (Requirement 7.3)
          expect(analytics.topReferrers.length).toBeLessThanOrEqual(10);

          // Verify referrers are sorted by count descending
          for (let i = 0; i < analytics.topReferrers.length - 1; i++) {
            expect(analytics.topReferrers[i].count).toBeGreaterThanOrEqual(
              analytics.topReferrers[i + 1].count
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 27: Click history grouping
   * Validates: Requirements 7.4
   */
  test('Property 27: Click history grouping', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 40 }),
        fc.ipV4(),
        fc.string({ minLength: 10, maxLength: 200 }),
        async (numDays, ip, userAgent) => {
          const shortCode = `hist${String(testCounter++).padStart(6, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          const now = new Date();

          // Record clicks across multiple days
          for (let i = 0; i < numDays; i++) {
            const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const clickEvent = new ClickEvent({
              shortCode,
              timestamp,
              anonymizedIp: AnalyticsService._anonymizeIp(ip),
              browser: 'Chrome',
              os: 'Windows',
              referrer: 'direct',
            });
            await clickEvent.save();
          }

          // Get analytics
          const analytics = await AnalyticsService.getUrlAnalytics(shortCode);

          // Verify click history is grouped by day (Requirement 7.4)
          expect(Array.isArray(analytics.clickHistory)).toBe(true);

          // Verify limited to 30 days
          expect(analytics.clickHistory.length).toBeLessThanOrEqual(30);

          // Verify each entry has date and count
          analytics.clickHistory.forEach((entry) => {
            expect(entry.date).toBeInstanceOf(Date);
            expect(typeof entry.count).toBe('number');
            expect(entry.count).toBeGreaterThan(0);
          });

          // Verify sorted by date descending (most recent first)
          for (let i = 0; i < analytics.clickHistory.length - 1; i++) {
            expect(
              analytics.clickHistory[i].date.getTime()
            ).toBeGreaterThanOrEqual(
              analytics.clickHistory[i + 1].date.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Feature: url-enhancements, Property 28: Graceful handling of missing data
   * Validates: Requirements 7.5
   */
  test('Property 28: Graceful handling of missing data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.string({ minLength: 10, maxLength: 200 })
        ),
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.webUrl()
        ),
        async (ip, userAgent, referrer) => {
          const shortCode = `miss${String(testCounter++).padStart(6, '0')}`;
          const url = new Url({
            shortCode,
            originalUrl: 'https://example.com',
            customCode: false,
          });
          await url.save();

          // Record click with potentially missing data (Requirement 7.5)
          await AnalyticsService.recordClick(shortCode, {
            ip,
            userAgent,
            referrer,
          });

          // Get analytics - should not throw error
          const analytics = await AnalyticsService.getUrlAnalytics(shortCode);

          // Verify analytics are returned without errors
          expect(analytics).not.toBeNull();
          expect(analytics.totalClicks).toBeGreaterThan(0);
          expect(analytics.uniqueVisitors).toBeGreaterThan(0);

          // Verify arrays are defined even with missing data
          expect(Array.isArray(analytics.topReferrers)).toBe(true);
          expect(Array.isArray(analytics.topBrowsers)).toBe(true);
          expect(Array.isArray(analytics.topOS)).toBe(true);
          expect(Array.isArray(analytics.clickHistory)).toBe(true);

          // Verify no null or undefined values in critical fields
          expect(analytics.totalClicks).not.toBeNull();
          expect(analytics.uniqueVisitors).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
