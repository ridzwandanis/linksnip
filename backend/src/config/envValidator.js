const logger = require('./logger');

/**
 * Environment Variable Validator
 * Requirements: 2.1, 2.2, 10.2
 *
 * Validates and provides defaults for environment variables
 * Logs warnings for invalid configurations
 */

/**
 * Validate and get rate limit configuration
 * @returns {Object} Rate limit configuration
 */
function getRateLimitConfig() {
  const config = {
    enabled: true,
    windowMs: 60000,
    maxRequests: 10,
  };

  // Parse RATE_LIMIT_ENABLED
  if (process.env.RATE_LIMIT_ENABLED !== undefined) {
    config.enabled = process.env.RATE_LIMIT_ENABLED !== 'false';
  }

  // Parse RATE_LIMIT_WINDOW_MS
  if (process.env.RATE_LIMIT_WINDOW_MS !== undefined) {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
    if (isNaN(windowMs) || windowMs < 0) {
      logger.warn('Invalid RATE_LIMIT_WINDOW_MS value, using default 60000ms', {
        provided: process.env.RATE_LIMIT_WINDOW_MS,
      });
    } else {
      config.windowMs = windowMs;
    }
  }

  // Parse RATE_LIMIT_MAX_REQUESTS
  if (process.env.RATE_LIMIT_MAX_REQUESTS !== undefined) {
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
    if (isNaN(maxRequests) || maxRequests < 0) {
      logger.warn('Invalid RATE_LIMIT_MAX_REQUESTS value, using default 10', {
        provided: process.env.RATE_LIMIT_MAX_REQUESTS,
      });
    } else {
      config.maxRequests = maxRequests;
      // If maxRequests is 0, disable rate limiting (Requirement 2.4)
      if (maxRequests === 0) {
        config.enabled = false;
      }
    }
  }

  return config;
}

/**
 * Validate admin authentication configuration
 * @returns {Object} Admin auth configuration with validation status
 */
function getAdminAuthConfig() {
  const config = {
    username: process.env.ADMIN_USERNAME || '',
    password: process.env.ADMIN_PASSWORD || '',
    isConfigured: false,
    warnings: [],
  };

  // Check if credentials are configured
  if (!config.username) {
    config.warnings.push(
      'ADMIN_USERNAME is not set - analytics endpoints will be inaccessible'
    );
  }

  if (!config.password) {
    config.warnings.push(
      'ADMIN_PASSWORD is not set - analytics endpoints will be inaccessible'
    );
  }

  // Check for weak password in production
  if (config.password && process.env.NODE_ENV === 'production') {
    if (config.password.length < 8) {
      config.warnings.push(
        'ADMIN_PASSWORD is less than 8 characters - consider using a stronger password'
      );
    }
    if (
      config.password === 'your-secure-password-here' ||
      config.password === 'admin'
    ) {
      config.warnings.push(
        'ADMIN_PASSWORD appears to be a default value - please change it for production'
      );
    }
  }

  config.isConfigured = !!(config.username && config.password);

  return config;
}

/**
 * Validate analytics configuration
 * @returns {Object} Analytics configuration
 */
function getAnalyticsConfig() {
  const config = {
    retentionDays: 90,
  };

  // Parse ANALYTICS_RETENTION_DAYS
  if (process.env.ANALYTICS_RETENTION_DAYS !== undefined) {
    const retentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS, 10);
    if (isNaN(retentionDays) || retentionDays < 1) {
      logger.warn(
        'Invalid ANALYTICS_RETENTION_DAYS value, using default 90 days',
        { provided: process.env.ANALYTICS_RETENTION_DAYS }
      );
    } else {
      config.retentionDays = retentionDays;
    }
  }

  return config;
}

/**
 * Validate all required environment variables
 * Logs warnings for missing or invalid configurations
 * @returns {Object} Validation result with all configurations
 */
function validateEnvironment() {
  const result = {
    isValid: true,
    warnings: [],
    errors: [],
    config: {},
  };

  // Validate required variables
  if (!process.env.MONGODB_URI) {
    result.warnings.push(
      'MONGODB_URI not set, using default mongodb://localhost:27017/url-shortener'
    );
  }

  if (!process.env.BASE_URL) {
    result.warnings.push(
      'BASE_URL not set, using default http://localhost:3000'
    );
  }

  // Get and validate rate limit config
  result.config.rateLimit = getRateLimitConfig();

  // Get and validate admin auth config
  result.config.adminAuth = getAdminAuthConfig();
  result.warnings.push(...result.config.adminAuth.warnings);

  // Get and validate analytics config
  result.config.analytics = getAnalyticsConfig();

  // Log all warnings
  result.warnings.forEach((warning) => {
    logger.warn(warning);
  });

  // Log all errors
  result.errors.forEach((error) => {
    logger.error(error);
    result.isValid = false;
  });

  return result;
}

/**
 * Get all configuration values with defaults
 * @returns {Object} Complete configuration object
 */
function getConfig() {
  return {
    // Server
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,

    // Database
    mongodbUri:
      process.env.MONGODB_URI || 'mongodb://localhost:27017/url-shortener',

    // Application
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',

    // Short Code
    shortCodeLength: parseInt(process.env.SHORT_CODE_LENGTH, 10) || 6,

    // Rate Limiting
    rateLimit: getRateLimitConfig(),

    // Admin Authentication
    adminAuth: getAdminAuthConfig(),

    // Analytics
    analytics: getAnalyticsConfig(),
  };
}

module.exports = {
  validateEnvironment,
  getConfig,
  getRateLimitConfig,
  getAdminAuthConfig,
  getAnalyticsConfig,
};
