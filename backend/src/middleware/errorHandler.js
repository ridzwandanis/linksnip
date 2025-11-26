const {
  ValidationError,
  NotFoundError,
  DatabaseError,
  ConflictError,
  RateLimitError,
} = require('./errors');
const logger = require('../config/logger');

/**
 * Centralized Error Handler Middleware
 * Requirements: 5.1, 5.2, 5.3, 5.4
 *
 * Handles all errors and returns standardized error responses:
 * - ValidationError (400)
 * - NotFoundError (404)
 * - ConflictError (409)
 * - RateLimitError (429)
 * - DatabaseError (503)
 * - ServerError (500)
 */
function errorHandler(err, req, res, next) {
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let details = null;

  // Handle ValidationError (400)
  if (err instanceof ValidationError || err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = err.message;
    details = err.details || null;
  }
  // Handle NotFoundError (404)
  else if (err instanceof NotFoundError || err.name === 'NotFoundError') {
    statusCode = 404;
    errorMessage = err.message;
  }
  // Handle ConflictError (409)
  else if (err instanceof ConflictError || err.name === 'ConflictError') {
    statusCode = 409;
    errorMessage = err.message;
    if (err.code) {
      details = { code: err.code };
    }
  }
  // Handle RateLimitError (429)
  else if (err instanceof RateLimitError || err.name === 'RateLimitError') {
    statusCode = 429;
    errorMessage = err.message;
    if (err.retryAfter) {
      details = { retryAfter: err.retryAfter };
    }
  }
  // Handle DatabaseError (503)
  else if (err instanceof DatabaseError || err.name === 'DatabaseError') {
    statusCode = 503;
    errorMessage = err.message;
  }
  // Handle Mongoose ValidationError
  else if (err.name === 'MongooseValidationError') {
    statusCode = 400;
    errorMessage = 'Validation failed';
    details = err.errors;
  }
  // Handle MongoDB duplicate key error
  else if (err.code === 11000) {
    statusCode = 400;
    errorMessage = 'Duplicate entry detected';
    details = { field: Object.keys(err.keyPattern || {})[0] };
  }
  // Handle generic errors
  else {
    statusCode = err.statusCode || 500;
    errorMessage = err.message || 'Internal server error';
  }

  // Log error with appropriate level and context
  const logContext = {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    statusCode,
  };

  if (statusCode >= 500) {
    logger.error('Server Error', logContext);
  } else if (statusCode >= 400) {
    logger.warn('Client Error', logContext);
  }

  // Return standardized error response format
  const response = {
    success: false,
    error: errorMessage,
  };

  // Include details if available
  if (details) {
    response.details = details;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
