const fc = require('fast-check');
const basicAuth = require('./basicAuth');

describe('BasicAuth Middleware', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set up test credentials
    process.env.ADMIN_USERNAME = 'testadmin';
    process.env.ADMIN_PASSWORD = 'testpassword123';
  });

  afterEach(() => {
    // Restore original env vars
    process.env = { ...originalEnv };
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: url-enhancements, Property 29: Analytics endpoint protection
     * Validates: Requirements 10.1
     *
     * For any request to an analytics endpoint without authentication credentials,
     * the system should return a 401 status code.
     */
    test('Property 29: Analytics endpoint protection', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '/api/analytics/urls/abc123',
            '/api/analytics/system',
            '/api/analytics/popular',
            '/api/analytics/recent'
          ),
          fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          (url, method) => {
            // Create mock request without Authorization header
            const req = {
              url,
              method,
              headers: {},
              ip: '192.168.1.1',
            };

            let statusCode = null;
            let responseBody = null;
            let headers = {};

            const res = {
              status: function (code) {
                statusCode = code;
                return this;
              },
              json: function (body) {
                responseBody = body;
                return this;
              },
              setHeader: function (name, value) {
                headers[name] = value;
                return this;
              },
            };

            let nextCalled = false;
            const next = () => {
              nextCalled = true;
            };

            // Call middleware
            basicAuth(req, res, next);

            // Verify 401 status code
            if (statusCode !== 401) {
              throw new Error(
                `Expected status 401 for unauth request, got ${statusCode}`
              );
            }

            // Verify WWW-Authenticate header is present
            if (!headers['WWW-Authenticate']) {
              throw new Error('WWW-Authenticate header should be present');
            }

            // Verify response body indicates failure
            if (!responseBody || responseBody.success !== false) {
              throw new Error(
                'Response should indicate authentication failure'
              );
            }

            // Verify next was not called
            if (nextCalled) {
              throw new Error('next() should not be called for unauth request');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: url-enhancements, Property 30: Credential validation
     * Validates: Requirements 10.2
     *
     * For any request to an analytics endpoint with authentication credentials,
     * the system should validate them against the ADMIN_USERNAME and ADMIN_PASSWORD
     * environment variables.
     */
    test('Property 30: Credential validation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (username, password) => {
            // Create Authorization header with provided credentials
            const credentials = Buffer.from(`${username}:${password}`).toString(
              'base64'
            );
            const authHeader = `Basic ${credentials}`;

            const req = {
              url: '/api/analytics/system',
              method: 'GET',
              headers: {
                authorization: authHeader,
              },
              ip: '192.168.1.1',
            };

            let statusCode = null;
            let responseBody = null;
            let headers = {};

            const res = {
              status: function (code) {
                statusCode = code;
                return this;
              },
              json: function (body) {
                responseBody = body;
                return this;
              },
              setHeader: function (name, value) {
                headers[name] = value;
                return this;
              },
            };

            let nextCalled = false;
            const next = () => {
              nextCalled = true;
            };

            // Call middleware
            basicAuth(req, res, next);

            // Check if credentials match environment variables
            const expectedUsername = process.env.ADMIN_USERNAME;
            const expectedPassword = process.env.ADMIN_PASSWORD;
            const shouldBeValid =
              username === expectedUsername && password === expectedPassword;

            if (shouldBeValid) {
              // Valid credentials - should call next()
              if (!nextCalled) {
                throw new Error(
                  'next() should be called for valid credentials'
                );
              }
              if (statusCode !== null) {
                throw new Error(
                  'Status should not be set for valid credentials'
                );
              }
            } else {
              // Invalid credentials - should return 401
              if (statusCode !== 401) {
                throw new Error(
                  `Expected status 401 for invalid credentials, got ${statusCode}`
                );
              }
              if (nextCalled) {
                throw new Error(
                  'next() should not be called for invalid credentials'
                );
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: url-enhancements, Property 31: Authentication failure response
     * Validates: Requirements 10.3, 10.4
     *
     * For any request to an analytics endpoint with invalid or missing credentials,
     * the system should return a 401 status code with a WWW-Authenticate header.
     */
    test('Property 31: Authentication failure response', () => {
      fc.assert(
        fc.property(
          fc.option(
            fc.oneof(
              // No header
              fc.constant(null),
              // Invalid format - not "Basic"
              fc.string().map((s) => `Bearer ${s}`),
              // Invalid base64
              fc.string({ minLength: 1, maxLength: 20 }),
              // Valid format but wrong credentials
              fc
                .tuple(
                  fc.string({ minLength: 1, maxLength: 20 }),
                  fc.string({ minLength: 1, maxLength: 20 })
                )
                .filter(
                  ([u, p]) =>
                    u !== process.env.ADMIN_USERNAME ||
                    p !== process.env.ADMIN_PASSWORD
                )
                .map(
                  ([u, p]) =>
                    `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`
                ),
              // Missing password
              fc
                .string({ minLength: 1, maxLength: 20 })
                .map((u) => `Basic ${Buffer.from(u).toString('base64')}`)
            ),
            { nil: null }
          ),
          (authHeader) => {
            const req = {
              url: '/api/analytics/system',
              method: 'GET',
              headers: authHeader ? { authorization: authHeader } : {},
              ip: '192.168.1.1',
            };

            let statusCode = null;
            let responseBody = null;
            let headers = {};

            const res = {
              status: function (code) {
                statusCode = code;
                return this;
              },
              json: function (body) {
                responseBody = body;
                return this;
              },
              setHeader: function (name, value) {
                headers[name] = value;
                return this;
              },
            };

            let nextCalled = false;
            const next = () => {
              nextCalled = true;
            };

            // Call middleware
            basicAuth(req, res, next);

            // Should return 401
            if (statusCode !== 401) {
              throw new Error(
                `Expected status 401 for invalid/missing auth, got ${statusCode}`
              );
            }

            // Should include WWW-Authenticate header
            if (!headers['WWW-Authenticate']) {
              throw new Error(
                'WWW-Authenticate header should be present on 401 response'
              );
            }

            // Should include realm in WWW-Authenticate
            if (!headers['WWW-Authenticate'].includes('Basic')) {
              throw new Error(
                'WWW-Authenticate header should specify Basic auth'
              );
            }

            // Should not call next()
            if (nextCalled) {
              throw new Error(
                'next() should not be called for invalid/missing auth'
              );
            }

            // Should return error in response body
            if (!responseBody || responseBody.success !== false) {
              throw new Error(
                'Response body should indicate authentication failure'
              );
            }

            if (!responseBody.error) {
              throw new Error('Response body should include error message');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: url-enhancements, Property 32: Successful authentication grants access
     * Validates: Requirements 10.5
     *
     * For any request to an analytics endpoint with valid credentials,
     * the system should allow access and return the requested data.
     */
    test('Property 32: Successful authentication grants access', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '/api/analytics/urls/abc123',
            '/api/analytics/system',
            '/api/analytics/popular',
            '/api/analytics/recent'
          ),
          (url) => {
            // Create valid credentials
            const username = process.env.ADMIN_USERNAME;
            const password = process.env.ADMIN_PASSWORD;
            const credentials = Buffer.from(`${username}:${password}`).toString(
              'base64'
            );
            const authHeader = `Basic ${credentials}`;

            const req = {
              url,
              method: 'GET',
              headers: {
                authorization: authHeader,
              },
              ip: '192.168.1.1',
            };

            let statusCode = null;
            let responseBody = null;

            const res = {
              status: function (code) {
                statusCode = code;
                return this;
              },
              json: function (body) {
                responseBody = body;
                return this;
              },
              setHeader: function () {
                return this;
              },
            };

            let nextCalled = false;
            const next = () => {
              nextCalled = true;
            };

            // Call middleware
            basicAuth(req, res, next);

            // Should call next() to allow access
            if (!nextCalled) {
              throw new Error(
                'next() should be called for valid credentials to grant access'
              );
            }

            // Should not set status code (let route handler do that)
            if (statusCode !== null) {
              throw new Error(
                'Status code should not be set for valid credentials'
              );
            }

            // Should not send response (let route handler do that)
            if (responseBody !== null) {
              throw new Error(
                'Response should not be sent for valid credentials'
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    /**
     * Test missing environment variables
     * Requirements: 10.2
     */
    test('should reject requests when ADMIN_USERNAME is not configured', () => {
      delete process.env.ADMIN_USERNAME;

      const credentials = Buffer.from('admin:password').toString('base64');
      const req = {
        url: '/api/analytics/system',
        method: 'GET',
        headers: {
          authorization: `Basic ${credentials}`,
        },
        ip: '192.168.1.1',
      };

      let statusCode = null;
      const res = {
        status: function (code) {
          statusCode = code;
          return this;
        },
        json: function () {
          return this;
        },
        setHeader: function () {
          return this;
        },
      };

      const next = jest.fn();

      basicAuth(req, res, next);

      expect(statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test missing environment variables
     * Requirements: 10.2
     */
    test('should reject requests when ADMIN_PASSWORD is not configured', () => {
      delete process.env.ADMIN_PASSWORD;

      const credentials = Buffer.from('admin:password').toString('base64');
      const req = {
        url: '/api/analytics/system',
        method: 'GET',
        headers: {
          authorization: `Basic ${credentials}`,
        },
        ip: '192.168.1.1',
      };

      let statusCode = null;
      const res = {
        status: function (code) {
          statusCode = code;
          return this;
        },
        json: function () {
          return this;
        },
        setHeader: function () {
          return this;
        },
      };

      const next = jest.fn();

      basicAuth(req, res, next);

      expect(statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test malformed Authorization header
     * Requirements: 10.3
     */
    test('should reject malformed Authorization header', () => {
      const req = {
        url: '/api/analytics/system',
        method: 'GET',
        headers: {
          authorization: 'NotBasic abc123',
        },
        ip: '192.168.1.1',
      };

      let statusCode = null;
      const res = {
        status: function (code) {
          statusCode = code;
          return this;
        },
        json: function () {
          return this;
        },
        setHeader: function () {
          return this;
        },
      };

      const next = jest.fn();

      basicAuth(req, res, next);

      expect(statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test Authorization header without colon separator
     * Requirements: 10.3
     */
    test('should reject credentials without colon separator', () => {
      const credentials = Buffer.from('adminpassword').toString('base64');
      const req = {
        url: '/api/analytics/system',
        method: 'GET',
        headers: {
          authorization: `Basic ${credentials}`,
        },
        ip: '192.168.1.1',
      };

      let statusCode = null;
      const res = {
        status: function (code) {
          statusCode = code;
          return this;
        },
        json: function () {
          return this;
        },
        setHeader: function () {
          return this;
        },
      };

      const next = jest.fn();

      basicAuth(req, res, next);

      expect(statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test case-sensitive credential validation
     * Requirements: 10.2
     */
    test('should validate credentials case-sensitively', () => {
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_PASSWORD = 'Password123';

      // Try with wrong case
      const credentials = Buffer.from('Admin:password123').toString('base64');
      const req = {
        url: '/api/analytics/system',
        method: 'GET',
        headers: {
          authorization: `Basic ${credentials}`,
        },
        ip: '192.168.1.1',
      };

      let statusCode = null;
      const res = {
        status: function (code) {
          statusCode = code;
          return this;
        },
        json: function () {
          return this;
        },
        setHeader: function () {
          return this;
        },
      };

      const next = jest.fn();

      basicAuth(req, res, next);

      expect(statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    /**
     * Test successful authentication with exact credentials
     * Requirements: 10.5
     */
    test('should allow access with exact matching credentials', () => {
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_PASSWORD = 'Password123';

      const credentials = Buffer.from('admin:Password123').toString('base64');
      const req = {
        url: '/api/analytics/system',
        method: 'GET',
        headers: {
          authorization: `Basic ${credentials}`,
        },
        ip: '192.168.1.1',
      };

      let statusCode = null;
      const res = {
        status: function (code) {
          statusCode = code;
          return this;
        },
        json: function () {
          return this;
        },
        setHeader: function () {
          return this;
        },
      };

      const next = jest.fn();

      basicAuth(req, res, next);

      expect(statusCode).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });
});
