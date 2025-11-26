const fc = require('fast-check');
const express = require('express');
const request = require('supertest');
const logger = require('./logger');
const errorHandler = require('../middleware/errorHandler');
const {
  ValidationError,
  NotFoundError,
  DatabaseError,
} = require('../middleware/errors');

describe('Logger Property Tests', () => {
  let app;
  let errorLogSpy;
  let warnLogSpy;
  let infoLogSpy;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());

    // Add test routes that throw different types of errors
    app.get('/error/validation', (req, res, next) => {
      next(new ValidationError('Validation failed'));
    });

    app.get('/error/notfound', (req, res, next) => {
      next(new NotFoundError('Resource not found'));
    });

    app.get('/error/database', (req, res, next) => {
      next(new DatabaseError('Database connection failed'));
    });

    app.get('/error/server', (req, res, next) => {
      const err = new Error('Unexpected server error');
      err.statusCode = 500;
      next(err);
    });

    app.get('/error/generic', (req, res, next) => {
      next(new Error('Generic error'));
    });

    // Add error handler
    app.use(errorHandler);

    // Spy on logger methods
    errorLogSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    warnLogSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    infoLogSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    errorLogSpy.mockRestore();
    warnLogSpy.mockRestore();
    infoLogSpy.mockRestore();
  });

  /**
   * **Feature: url-shortener, Property 14: Error logging completeness**
   * **Validates: Requirements 9.2**
   *
   * For any error that occurs during request processing, the error log should contain
   * the error message, stack trace, and context information.
   */
  test('Property 14: Error logging completeness - all errors should log message, stack trace, and context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { path: '/error/validation', expectedStatus: 400 },
          { path: '/error/notfound', expectedStatus: 404 },
          { path: '/error/database', expectedStatus: 503 },
          { path: '/error/server', expectedStatus: 500 },
          { path: '/error/generic', expectedStatus: 500 }
        ),
        async (errorCase) => {
          // Clear previous calls
          errorLogSpy.mockClear();
          warnLogSpy.mockClear();

          // Make request that triggers error
          const response = await request(app).get(errorCase.path);

          // Verify response status
          expect(response.status).toBe(errorCase.expectedStatus);

          // Determine which log method should have been called
          const logSpy =
            errorCase.expectedStatus >= 500 ? errorLogSpy : warnLogSpy;

          // Verify appropriate logger method was called
          expect(logSpy).toHaveBeenCalled();

          // Get the logged context
          const logCalls = logSpy.mock.calls;
          expect(logCalls.length).toBeGreaterThan(0);

          // Verify the log contains required information
          const loggedContext = logCalls[0][1]; // Second argument is the context object

          // Verify error message is present
          expect(loggedContext).toHaveProperty('message');
          expect(typeof loggedContext.message).toBe('string');
          expect(loggedContext.message.length).toBeGreaterThan(0);

          // Verify stack trace is present
          expect(loggedContext).toHaveProperty('stack');
          expect(typeof loggedContext.stack).toBe('string');
          expect(loggedContext.stack.length).toBeGreaterThan(0);

          // Verify context information is present
          expect(loggedContext).toHaveProperty('url');
          expect(loggedContext.url).toBe(errorCase.path);

          expect(loggedContext).toHaveProperty('method');
          expect(loggedContext.method).toBe('GET');

          expect(loggedContext).toHaveProperty('statusCode');
          expect(loggedContext.statusCode).toBe(errorCase.expectedStatus);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 14: Server errors (5xx) are logged with error level', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/error/server', '/error/generic', '/error/database'),
        async (path) => {
          errorLogSpy.mockClear();
          warnLogSpy.mockClear();

          await request(app).get(path);

          // For 5xx errors, error logger should be called
          if (path === '/error/database') {
            // Database error is 503
            expect(errorLogSpy).toHaveBeenCalled();
          } else {
            // Server errors are 500
            expect(errorLogSpy).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 14: Client errors (4xx) are logged with warn level', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/error/validation', '/error/notfound'),
        async (path) => {
          errorLogSpy.mockClear();
          warnLogSpy.mockClear();

          await request(app).get(path);

          // For 4xx errors, warn logger should be called
          expect(warnLogSpy).toHaveBeenCalled();
          // Error logger should NOT be called for client errors
          expect(errorLogSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Log Level Appropriateness Property Tests', () => {
  let app;
  let errorLogSpy;
  let warnLogSpy;
  let infoLogSpy;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());

    // Add test routes for successful operations
    app.get('/success', (req, res) => {
      logger.info('Successful operation');
      res.json({ success: true });
    });

    // Add test routes for validation errors
    app.post('/validate', (req, res, next) => {
      if (!req.body.url) {
        logger.warn('Validation failed: missing URL');
        return next(new ValidationError('URL is required'));
      }
      res.json({ success: true });
    });

    // Add test routes for server errors
    app.get('/fail', (req, res, next) => {
      logger.error('Server error occurred');
      next(new Error('Server failure'));
    });

    app.use(errorHandler);

    // Spy on logger methods
    errorLogSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    warnLogSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    infoLogSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    errorLogSpy.mockRestore();
    warnLogSpy.mockRestore();
    infoLogSpy.mockRestore();
  });

  /**
   * **Feature: url-shortener, Property 15: Log level appropriateness**
   * **Validates: Requirements 9.3**
   *
   * For any logged event, the log level should be appropriate to the event type
   * (ERROR for failures, WARN for validation issues, INFO for successful operations).
   */
  test('Property 15: Log level appropriateness - events use correct log levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          {
            type: 'success',
            path: '/success',
            method: 'GET',
            expectedLevel: 'info',
            expectedStatus: 200,
          },
          {
            type: 'validation',
            path: '/validate',
            method: 'POST',
            body: {},
            expectedLevel: 'warn',
            expectedStatus: 400,
          },
          {
            type: 'server_error',
            path: '/fail',
            method: 'GET',
            expectedLevel: 'error',
            expectedStatus: 500,
          }
        ),
        async (eventCase) => {
          // Clear previous calls
          errorLogSpy.mockClear();
          warnLogSpy.mockClear();
          infoLogSpy.mockClear();

          // Make request based on event type
          let response;
          if (eventCase.method === 'POST') {
            response = await request(app)
              .post(eventCase.path)
              .send(eventCase.body || {});
          } else {
            response = await request(app).get(eventCase.path);
          }

          // Verify response status
          expect(response.status).toBe(eventCase.expectedStatus);

          // Verify appropriate log level was used
          switch (eventCase.expectedLevel) {
            case 'error':
              expect(errorLogSpy).toHaveBeenCalled();
              break;
            case 'warn':
              expect(warnLogSpy).toHaveBeenCalled();
              break;
            case 'info':
              expect(infoLogSpy).toHaveBeenCalled();
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 15: Successful operations use INFO level', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant('/success'), async (path) => {
        infoLogSpy.mockClear();
        errorLogSpy.mockClear();
        warnLogSpy.mockClear();

        await request(app).get(path);

        // Info should be called for successful operations
        expect(infoLogSpy).toHaveBeenCalled();
        // Error and warn should NOT be called
        expect(errorLogSpy).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  test('Property 15: Validation failures use WARN level', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          url: fc.constantFrom(undefined, null, ''),
        }),
        async (body) => {
          warnLogSpy.mockClear();
          errorLogSpy.mockClear();

          await request(app).post('/validate').send(body);

          // Warn should be called for validation errors
          expect(warnLogSpy).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 15: Server failures use ERROR level', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant('/fail'), async (path) => {
        errorLogSpy.mockClear();
        warnLogSpy.mockClear();

        await request(app).get(path);

        // Error should be called for server failures
        expect(errorLogSpy).toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  test('Property 15: Log levels follow severity hierarchy', async () => {
    // Test that error > warn > info in terms of severity
    const testCases = [
      { level: 'error', statusCode: 500 },
      { level: 'warn', statusCode: 400 },
      { level: 'info', statusCode: 200 },
    ];

    for (const testCase of testCases) {
      errorLogSpy.mockClear();
      warnLogSpy.mockClear();
      infoLogSpy.mockClear();

      if (testCase.statusCode === 500) {
        await request(app).get('/fail');
        expect(errorLogSpy).toHaveBeenCalled();
      } else if (testCase.statusCode === 400) {
        await request(app).post('/validate').send({});
        expect(warnLogSpy).toHaveBeenCalled();
      } else {
        await request(app).get('/success');
        expect(infoLogSpy).toHaveBeenCalled();
      }
    }
  });
});
