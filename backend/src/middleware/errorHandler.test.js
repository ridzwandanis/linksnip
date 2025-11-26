const fc = require('fast-check');
const errorHandler = require('./errorHandler');
const { ValidationError, NotFoundError, DatabaseError } = require('./errors');
const logger = require('../config/logger');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      url: '/test',
      method: 'GET',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    // Suppress logger during tests
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    logger.error.mockRestore();
    logger.warn.mockRestore();
  });

  /**
   * **Feature: url-shortener, Property 10: Error response standardization**
   * **Validates: Requirements 5.1, 5.3**
   *
   * For any error condition (validation error, not found, database error),
   * the error response should follow the standardized format with success: false,
   * error message, and appropriate HTTP status code.
   */
  describe('Property 10: Error response standardization', () => {
    it('should return standardized format for ValidationError', async () => {
      const errorMessageArbitrary = fc.string({ minLength: 1, maxLength: 100 });

      await fc.assert(
        fc.asyncProperty(errorMessageArbitrary, async (errorMessage) => {
          // Create fresh mocks for each iteration
          const testRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          };

          const error = new ValidationError(errorMessage);

          errorHandler(error, req, testRes, next);

          // Verify status code
          expect(testRes.status).toHaveBeenCalledWith(400);

          // Verify response format
          expect(testRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.any(String),
            })
          );

          // Verify the response has the correct structure
          const response = testRes.json.mock.calls[0][0];
          expect(response.success).toBe(false);
          expect(typeof response.error).toBe('string');
          expect(response.error).toBe(errorMessage);
        }),
        { numRuns: 100 }
      );
    });

    it('should return standardized format for NotFoundError', async () => {
      const errorMessageArbitrary = fc.string({ minLength: 1, maxLength: 100 });

      await fc.assert(
        fc.asyncProperty(errorMessageArbitrary, async (errorMessage) => {
          // Create fresh mocks for each iteration
          const testRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          };

          const error = new NotFoundError(errorMessage);

          errorHandler(error, req, testRes, next);

          // Verify status code
          expect(testRes.status).toHaveBeenCalledWith(404);

          // Verify response format
          expect(testRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.any(String),
            })
          );

          // Verify the response has the correct structure
          const response = testRes.json.mock.calls[0][0];
          expect(response.success).toBe(false);
          expect(typeof response.error).toBe('string');
          expect(response.error).toBe(errorMessage);
        }),
        { numRuns: 100 }
      );
    });

    it('should return standardized format for DatabaseError', async () => {
      const errorMessageArbitrary = fc.string({ minLength: 1, maxLength: 100 });

      await fc.assert(
        fc.asyncProperty(errorMessageArbitrary, async (errorMessage) => {
          // Create fresh mocks for each iteration
          const testRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          };

          const error = new DatabaseError(errorMessage);

          errorHandler(error, req, testRes, next);

          // Verify status code
          expect(testRes.status).toHaveBeenCalledWith(503);

          // Verify response format
          expect(testRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.any(String),
            })
          );

          // Verify the response has the correct structure
          const response = testRes.json.mock.calls[0][0];
          expect(response.success).toBe(false);
          expect(typeof response.error).toBe('string');
          expect(response.error).toBe(errorMessage);
        }),
        { numRuns: 100 }
      );
    });

    it('should return standardized format for generic errors with 500 status', async () => {
      const errorMessageArbitrary = fc.string({ minLength: 1, maxLength: 100 });

      await fc.assert(
        fc.asyncProperty(errorMessageArbitrary, async (errorMessage) => {
          // Create fresh mocks for each iteration
          const testRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          };

          const error = new Error(errorMessage);

          errorHandler(error, req, testRes, next);

          // Verify status code
          expect(testRes.status).toHaveBeenCalledWith(500);

          // Verify response format
          expect(testRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.any(String),
            })
          );

          // Verify the response has the correct structure
          const response = testRes.json.mock.calls[0][0];
          expect(response.success).toBe(false);
          expect(typeof response.error).toBe('string');
        }),
        { numRuns: 100 }
      );
    });

    it('should always include success: false in error responses', async () => {
      // Generator for different error types
      const errorTypeArbitrary = fc.constantFrom(
        'validation',
        'notFound',
        'database',
        'generic'
      );
      const errorMessageArbitrary = fc.string({ minLength: 1, maxLength: 100 });

      await fc.assert(
        fc.asyncProperty(
          errorTypeArbitrary,
          errorMessageArbitrary,
          async (errorType, errorMessage) => {
            // Create fresh mocks for each iteration
            const testRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn().mockReturnThis(),
            };

            let error;
            switch (errorType) {
              case 'validation':
                error = new ValidationError(errorMessage);
                break;
              case 'notFound':
                error = new NotFoundError(errorMessage);
                break;
              case 'database':
                error = new DatabaseError(errorMessage);
                break;
              default:
                error = new Error(errorMessage);
            }

            errorHandler(error, req, testRes, next);

            // Verify response always has success: false
            const response = testRes.json.mock.calls[0][0];
            expect(response.success).toBe(false);
            expect(response).toHaveProperty('error');
            expect(typeof response.error).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Unit tests for specific error scenarios
  describe('Unit Tests - Specific Error Scenarios', () => {
    it('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid input',
      });
    });

    it('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('Resource not found');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found',
      });
    });

    it('should handle DatabaseError with 503 status', () => {
      const error = new DatabaseError('Database connection failed');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed',
      });
    });

    it('should handle generic errors with 500 status', () => {
      const error = new Error('Something went wrong');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong',
      });
    });

    it('should include details when ValidationError has details', () => {
      const error = new ValidationError('Validation failed', {
        field: 'url',
        reason: 'invalid format',
      });
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: {
          field: 'url',
          reason: 'invalid format',
        },
      });
    });

    it('should handle MongoDB duplicate key error', () => {
      const error = {
        code: 11000,
        keyPattern: { shortCode: 1 },
        message: 'Duplicate key error',
      };
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Duplicate entry detected',
        details: { field: 'shortCode' },
      });
    });

    it('should log errors with status >= 500', () => {
      const error = new Error('Server error');
      errorHandler(error, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        'Server Error',
        expect.objectContaining({
          message: 'Server error',
          url: '/test',
          method: 'GET',
          statusCode: 500,
        })
      );
    });
  });
});
