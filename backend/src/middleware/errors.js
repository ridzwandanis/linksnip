/**
 * Custom Error Classes
 * Requirements: 5.1
 */

/**
 * ValidationError - For invalid input data
 * HTTP Status: 400 Bad Request
 */
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * NotFoundError - For resources that don't exist
 * HTTP Status: 404 Not Found
 */
class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * DatabaseError - For database connection or operation failures
 * HTTP Status: 503 Service Unavailable
 */
class DatabaseError extends Error {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 503;
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ConflictError - For resource conflicts (e.g., duplicate custom codes)
 * HTTP Status: 409 Conflict
 */
class ConflictError extends Error {
  constructor(message = 'Resource conflict', code = null) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * RateLimitError - For rate limit exceeded
 * HTTP Status: 429 Too Many Requests
 */
class RateLimitError extends Error {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.retryAfter = retryAfter;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  ValidationError,
  NotFoundError,
  DatabaseError,
  ConflictError,
  RateLimitError,
};
