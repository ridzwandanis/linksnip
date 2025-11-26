const { RateLimitError } = require('./errors');
const logger = require('../config/logger');

/**
 * Rate Limiter Middleware
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 9.1, 9.2, 9.3, 9.4
 *
 * Implements in-memory rate limiting per IP address
 * Tracks requests within time windows and enforces limits
 */
class RateLimiter {
  /**
   * Create a rate limiter instance
   * @param {Object} options - Configuration options
   * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
   * @param {number} options.maxRequests - Maximum requests per window (default: 10)
   * @param {boolean} options.enabled - Enable/disable rate limiting (default: true)
   */
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.maxRequests =
      options.maxRequests !== undefined ? options.maxRequests : 10; // 10 requests default
    this.enabled = options.enabled !== false; // enabled by default
    this.store = new Map(); // { ip: { count, resetTime } }

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(
      () => {
        this._cleanup();
      },
      5 * 60 * 1000
    );

    logger.info('RateLimiter initialized', {
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      enabled: this.enabled,
    });
  }

  /**
   * Create middleware function
   * @returns {Function} Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      // If rate limiting is disabled or maxRequests is 0, skip
      if (!this.enabled || this.maxRequests <= 0) {
        return next();
      }

      // Get client IP address
      const ip = this._getClientIp(req);

      // Check rate limit
      const limitInfo = this.checkLimit(ip);

      // Add rate limit headers to response
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limitInfo.remaining));
      res.setHeader(
        'X-RateLimit-Reset',
        Math.floor(limitInfo.resetTime / 1000)
      );

      // If limit exceeded, return error
      if (!limitInfo.allowed) {
        const retryAfter = Math.ceil((limitInfo.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter);

        logger.warn('Rate limit exceeded', { ip, retryAfter });

        return next(
          new RateLimitError(
            'Too many requests, please try again later',
            retryAfter
          )
        );
      }

      next();
    };
  }

  /**
   * Check if IP has exceeded rate limit
   * @param {string} ip - Client IP address
   * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
   */
  checkLimit(ip) {
    const now = Date.now();
    const record = this.store.get(ip);

    // If no record exists or window has expired, create new record
    if (!record || now >= record.resetTime) {
      const resetTime = now + this.windowMs;
      this.store.set(ip, { count: 1, resetTime });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
      };
    }

    // Increment count
    record.count++;
    this.store.set(ip, record);

    // Check if limit exceeded
    const allowed = record.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - record.count);

    return {
      allowed,
      remaining,
      resetTime: record.resetTime,
    };
  }

  /**
   * Get client IP address from request
   * @param {Request} req - Express request object
   * @returns {string} Client IP address
   * @private
   */
  _getClientIp(req) {
    // Check for X-Forwarded-For header (proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // Take the first IP in the list
      return forwarded.split(',')[0].trim();
    }

    // Fall back to connection remote address
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Clean up expired entries from store
   * @private
   */
  _cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [ip, record] of this.store.entries()) {
      if (now >= record.resetTime) {
        this.store.delete(ip);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup', { entriesRemoved: cleaned });
    }
  }

  /**
   * Clear all rate limit records (useful for testing)
   */
  reset() {
    this.store.clear();
  }

  /**
   * Stop the cleanup interval (useful for testing)
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Create rate limiter from environment variables
 * @returns {RateLimiter} Configured rate limiter instance
 */
function createRateLimiter() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10;
  const enabled = process.env.RATE_LIMIT_ENABLED !== 'false';

  // Validate configuration
  if (isNaN(windowMs) || windowMs < 0) {
    logger.warn('Invalid RATE_LIMIT_WINDOW_MS, using default 60000ms');
  }

  if (isNaN(maxRequests) || maxRequests < 0) {
    logger.warn('Invalid RATE_LIMIT_MAX_REQUESTS, using default 10');
  }

  return new RateLimiter({
    windowMs: isNaN(windowMs) || windowMs < 0 ? 60000 : windowMs,
    maxRequests: isNaN(maxRequests) || maxRequests < 0 ? 10 : maxRequests,
    enabled,
  });
}

module.exports = { RateLimiter, createRateLimiter };
