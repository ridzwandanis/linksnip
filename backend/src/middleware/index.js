/**
 * Middleware exports
 * Centralized export for all middleware components
 */

const errorHandler = require('./errorHandler');
const notFoundHandler = require('./notFoundHandler');
const {
  ValidationError,
  NotFoundError,
  DatabaseError,
  ConflictError,
  RateLimitError,
} = require('./errors');
const { RateLimiter, createRateLimiter } = require('./rateLimiter');
const basicAuth = require('./basicAuth');

module.exports = {
  errorHandler,
  notFoundHandler,
  ValidationError,
  NotFoundError,
  DatabaseError,
  ConflictError,
  RateLimitError,
  RateLimiter,
  createRateLimiter,
  basicAuth,
};
