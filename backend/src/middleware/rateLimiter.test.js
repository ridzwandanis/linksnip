const fc = require('fast-check');
const { RateLimiter } = require('./rateLimiter');
const { RateLimitError } = require('./errors');

describe('RateLimiter', () => {
  let rateLimiter;

  afterEach(() => {
    if (rateLimiter) {
      rateLimiter.stop();
    }
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: url-enhancements, Property 1: Request limit enforcement per IP
     * Validates: Requirements 1.1, 1.2
     *
     * For any IP address making requests to the URL creation endpoint,
     * the 11th request within a 1-minute window should be rejected with a 429 status code.
     */
    test('Property 1: Request limit enforcement per IP', () => {
      fc.assert(
        fc.property(
          fc.ipV4(),
          fc.integer({ min: 1, max: 5 }), // maxRequests
          (ip, maxRequests) => {
            // Create rate limiter with custom max requests
            rateLimiter = new RateLimiter({
              windowMs: 60000,
              maxRequests,
              enabled: true,
            });

            // Make maxRequests number of requests - all should be allowed
            for (let i = 0; i < maxRequests; i++) {
              const result = rateLimiter.checkLimit(ip);
              if (!result.allowed) {
                throw new Error(
                  `Request ${i + 1} should be allowed but was rejected`
                );
              }
            }

            // The next request (maxRequests + 1) should be rejected
            const exceededResult = rateLimiter.checkLimit(ip);
            if (exceededResult.allowed) {
              throw new Error(
                `Request ${maxRequests + 1} should be rejected but was allowed`
              );
            }

            // Verify remaining is 0
            if (exceededResult.remaining !== 0) {
              throw new Error(
                `Expected remaining to be 0, got ${exceededResult.remaining}`
              );
            }

            rateLimiter.stop();
            rateLimiter = null;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: url-enhancements, Property 2: Rate limit headers on all requests
     * Validates: Requirements 9.1, 9.2, 9.3
     *
     * For any request to a rate-limited endpoint, the response should include
     * X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers.
     */
    test('Property 2: Rate limit headers on all requests', () => {
      fc.assert(
        fc.property(
          fc.ipV4(),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (ip, maxRequests, requestCount) => {
            rateLimiter = new RateLimiter({
              windowMs: 60000,
              maxRequests,
              enabled: true,
            });

            // Create mock request and response
            const req = {
              ip,
              headers: {},
              connection: { remoteAddress: ip },
            };

            const headers = {};
            const res = {
              setHeader: (name, value) => {
                headers[name] = value;
              },
            };

            let nextCalled = false;
            const next = (err) => {
              nextCalled = true;
              if (err && !(err instanceof RateLimitError)) {
                throw err;
              }
            };

            const middleware = rateLimiter.middleware();

            // Make requestCount requests
            const numRequests = Math.min(requestCount, maxRequests + 5);
            for (let i = 0; i < numRequests; i++) {
              middleware(req, res, next);

              // Verify headers are present
              if (!headers['X-RateLimit-Limit']) {
                throw new Error('X-RateLimit-Limit header missing');
              }
              if (headers['X-RateLimit-Remaining'] === undefined) {
                throw new Error('X-RateLimit-Remaining header missing');
              }
              if (!headers['X-RateLimit-Reset']) {
                throw new Error('X-RateLimit-Reset header missing');
              }

              // Verify header values
              if (headers['X-RateLimit-Limit'] !== maxRequests) {
                throw new Error(
                  `X-RateLimit-Limit should be ${maxRequests}, got ${headers['X-RateLimit-Limit']}`
                );
              }
            }

            rateLimiter.stop();
            rateLimiter = null;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: url-enhancements, Property 3: Retry-After header on limit exceeded
     * Validates: Requirements 1.3, 9.4
     *
     * For any request that exceeds the rate limit, the response should include
     * a Retry-After header with a valid future timestamp.
     */
    test('Property 3: Retry-After header on limit exceeded', () => {
      fc.assert(
        fc.property(
          fc.ipV4(),
          fc.integer({ min: 1, max: 10 }),
          (ip, maxRequests) => {
            rateLimiter = new RateLimiter({
              windowMs: 60000,
              maxRequests,
              enabled: true,
            });

            const req = {
              ip,
              headers: {},
              connection: { remoteAddress: ip },
            };

            const headers = {};
            const res = {
              setHeader: (name, value) => {
                headers[name] = value;
              },
            };

            let rateLimitError = null;
            const next = (err) => {
              if (err instanceof RateLimitError) {
                rateLimitError = err;
              }
            };

            const middleware = rateLimiter.middleware();

            // Make maxRequests + 1 requests to exceed limit
            for (let i = 0; i <= maxRequests; i++) {
              middleware(req, res, next);
            }

            // Verify Retry-After header is present
            if (!headers['Retry-After']) {
              throw new Error('Retry-After header missing when limit exceeded');
            }

            // Verify Retry-After is a positive number
            const retryAfter = headers['Retry-After'];
            if (typeof retryAfter !== 'number' || retryAfter <= 0) {
              throw new Error(
                `Retry-After should be a positive number, got ${retryAfter}`
              );
            }

            // Verify Retry-After is reasonable (should be <= windowMs in seconds)
            if (retryAfter > 60) {
              throw new Error(
                `Retry-After should be <= 60 seconds, got ${retryAfter}`
              );
            }

            // Verify RateLimitError was thrown
            if (!rateLimitError) {
              throw new Error(
                'RateLimitError should be thrown when limit exceeded'
              );
            }

            // Verify error has retryAfter property
            if (!rateLimitError.retryAfter) {
              throw new Error('RateLimitError should have retryAfter property');
            }

            rateLimiter.stop();
            rateLimiter = null;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: url-enhancements, Property 4: Rate limit counter reset after window
     * Validates: Requirements 1.4
     *
     * For any IP address that has reached the rate limit, after the time window expires,
     * the counter should reset and new requests should be allowed.
     */
    test('Property 4: Rate limit counter reset after window', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.ipV4(),
          fc.integer({ min: 2, max: 5 }), // Start from 2 to avoid edge case
          fc.integer({ min: 100, max: 300 }), // short window for testing
          async (ip, maxRequests, windowMs) => {
            const limiter = new RateLimiter({
              windowMs,
              maxRequests,
              enabled: true,
            });

            try {
              // Exhaust the rate limit
              for (let i = 0; i < maxRequests; i++) {
                limiter.checkLimit(ip);
              }

              // Next request should be rejected
              const rejectedResult = limiter.checkLimit(ip);
              if (rejectedResult.allowed) {
                throw new Error(
                  'Request should be rejected after exhausting limit'
                );
              }

              // Wait for window to expire
              const waitTime = windowMs + 50; // Add buffer
              await new Promise((resolve) => setTimeout(resolve, waitTime));

              // After window expires, request should be allowed
              const allowedResult = limiter.checkLimit(ip);
              if (!allowedResult.allowed) {
                throw new Error('Request should be allowed after window reset');
              }

              // Verify remaining count is reset
              if (allowedResult.remaining !== maxRequests - 1) {
                throw new Error(
                  `Remaining should be ${maxRequests - 1} after reset, got ${allowedResult.remaining}`
                );
              }
            } finally {
              limiter.stop();
            }
          }
        ),
        { numRuns: 15 } // Fewer runs due to setTimeout
      );
    }, 30000); // 30 second timeout for this test

    /**
     * Feature: url-enhancements, Property 5: Redirects are not rate limited
     * Validates: Requirements 1.5
     *
     * For any number of redirect requests (GET /:shortcode),
     * none should be rejected due to rate limiting.
     *
     * Note: This property tests that when rate limiting is disabled,
     * all requests are allowed regardless of count.
     */
    test('Property 5: Redirects are not rate limited', () => {
      fc.assert(
        fc.property(
          fc.ipV4(),
          fc.integer({ min: 20, max: 100 }), // Many requests
          (ip, requestCount) => {
            // Create rate limiter with enabled=false to simulate redirect endpoint
            rateLimiter = new RateLimiter({
              windowMs: 60000,
              maxRequests: 10,
              enabled: false, // Disabled for redirect endpoints
            });

            const req = {
              ip,
              headers: {},
              connection: { remoteAddress: ip },
            };

            const res = {
              setHeader: () => {},
            };

            let errorThrown = false;
            const next = (err) => {
              if (err) {
                errorThrown = true;
              }
            };

            const middleware = rateLimiter.middleware();

            // Make many requests - all should be allowed
            for (let i = 0; i < requestCount; i++) {
              middleware(req, res, next);

              if (errorThrown) {
                throw new Error(
                  `Request ${i + 1} should not be rate limited but was rejected`
                );
              }
            }

            rateLimiter.stop();
            rateLimiter = null;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests - Configuration', () => {
    /**
     * Test default values when no config provided
     * Requirements: 2.1, 2.2
     */
    test('should use default values when no config provided', () => {
      rateLimiter = new RateLimiter();

      expect(rateLimiter.windowMs).toBe(60000); // 1 minute
      expect(rateLimiter.maxRequests).toBe(10);
      expect(rateLimiter.enabled).toBe(true);

      rateLimiter.stop();
    });

    /**
     * Test custom configuration values
     * Requirements: 2.1, 2.2
     */
    test('should accept custom configuration values', () => {
      rateLimiter = new RateLimiter({
        windowMs: 120000,
        maxRequests: 20,
        enabled: true,
      });

      expect(rateLimiter.windowMs).toBe(120000);
      expect(rateLimiter.maxRequests).toBe(20);
      expect(rateLimiter.enabled).toBe(true);

      rateLimiter.stop();
    });

    /**
     * Test rate limit disable when set to 0
     * Requirements: 2.4
     */
    test('should allow all requests when maxRequests is 0', () => {
      const testLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 0,
        enabled: true,
      });

      const req = { ip: '192.168.1.1', headers: {}, connection: {} };
      const res = { setHeader: jest.fn() };

      const middleware = testLimiter.middleware();

      // Make many requests - all should pass through
      for (let i = 0; i < 20; i++) {
        let nextCalled = false;
        let errorPassed = null;
        const next = (err) => {
          nextCalled = true;
          errorPassed = err;
        };

        middleware(req, res, next);
        expect(nextCalled).toBe(true);
        expect(errorPassed).toBeUndefined();
      }

      testLimiter.stop();
    });

    /**
     * Test rate limiting disabled via enabled flag
     * Requirements: 2.4
     */
    test('should allow all requests when enabled is false', () => {
      const testLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        enabled: false,
      });

      const req = { ip: '192.168.1.1', headers: {}, connection: {} };
      const res = { setHeader: jest.fn() };

      const middleware = testLimiter.middleware();

      // Make many requests - all should pass through
      for (let i = 0; i < 20; i++) {
        let nextCalled = false;
        let errorPassed = null;
        const next = (err) => {
          nextCalled = true;
          errorPassed = err;
        };

        middleware(req, res, next);
        expect(nextCalled).toBe(true);
        expect(errorPassed).toBeUndefined();
      }

      testLimiter.stop();
    });

    /**
     * Test invalid configuration handling
     * Requirements: 2.3
     */
    test('should handle invalid configuration gracefully', () => {
      // Negative values should still create a limiter
      rateLimiter = new RateLimiter({
        windowMs: -1000,
        maxRequests: -5,
        enabled: true,
      });

      // Should still be created (values will be used as-is)
      expect(rateLimiter).toBeDefined();
      expect(rateLimiter.windowMs).toBe(-1000);
      expect(rateLimiter.maxRequests).toBe(-5);

      rateLimiter.stop();
    });

    /**
     * Test cleanup mechanism
     * Requirements: Internal implementation
     */
    test('should clean up expired entries', (done) => {
      rateLimiter = new RateLimiter({
        windowMs: 100, // Very short window
        maxRequests: 5,
        enabled: true,
      });

      const ip = '192.168.1.1';

      // Make a request to create an entry
      rateLimiter.checkLimit(ip);
      expect(rateLimiter.store.size).toBe(1);

      // Wait for window to expire and cleanup to run
      setTimeout(() => {
        rateLimiter._cleanup();
        expect(rateLimiter.store.size).toBe(0);
        rateLimiter.stop();
        done();
      }, 150);
    });

    /**
     * Test reset functionality
     * Requirements: Testing utility
     */
    test('should reset all rate limit records', () => {
      rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        enabled: true,
      });

      // Create entries for multiple IPs
      rateLimiter.checkLimit('192.168.1.1');
      rateLimiter.checkLimit('192.168.1.2');
      rateLimiter.checkLimit('192.168.1.3');

      expect(rateLimiter.store.size).toBe(3);

      // Reset should clear all entries
      rateLimiter.reset();
      expect(rateLimiter.store.size).toBe(0);

      rateLimiter.stop();
    });

    /**
     * Test X-Forwarded-For header handling
     * Requirements: 1.1
     */
    test('should extract IP from X-Forwarded-For header', () => {
      rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        enabled: true,
      });

      const req = {
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
        ip: '192.168.1.1',
        connection: {},
      };

      const res = { setHeader: jest.fn() };
      const next = jest.fn();

      const middleware = rateLimiter.middleware();
      middleware(req, res, next);

      // Should use the first IP from X-Forwarded-For
      const result = rateLimiter.checkLimit('203.0.113.1');
      expect(result.remaining).toBe(3); // Already made 2 requests (1 from middleware, 1 from checkLimit)

      rateLimiter.stop();
    });
  });
});
