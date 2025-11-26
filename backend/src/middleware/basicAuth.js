const logger = require('../config/logger');

/**
 * Basic Authentication Middleware
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 *
 * Implements HTTP Basic Authentication for protecting analytics endpoints
 * Validates credentials against environment variables
 */

/**
 * Parse Authorization header and extract credentials
 * @param {string} authHeader - Authorization header value
 * @returns {Object|null} { username, password } or null if invalid
 * @private
 */
function parseAuthHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  // Check if it's Basic auth
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Basic') {
    return null;
  }

  try {
    // Decode base64 credentials
    const credentials = Buffer.from(parts[1], 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (!username || !password) {
      return null;
    }

    return { username, password };
  } catch (error) {
    logger.warn('Failed to parse Authorization header', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Validate credentials against environment variables
 * @param {string} username - Provided username
 * @param {string} password - Provided password
 * @returns {boolean} True if credentials are valid
 * @private
 */
function validateCredentials(username, password) {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Check if credentials are configured
  if (!adminUsername || !adminPassword) {
    logger.error('ADMIN_USERNAME or ADMIN_PASSWORD not configured');
    return false;
  }

  // Compare credentials
  return username === adminUsername && password === adminPassword;
}

/**
 * Basic Authentication middleware
 * Protects routes by requiring valid HTTP Basic Auth credentials
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
function basicAuth(req, res, next) {
  // Extract Authorization header
  const authHeader = req.headers.authorization;

  // Parse credentials
  const credentials = parseAuthHeader(authHeader);

  // If no credentials or invalid format, return 401
  if (!credentials) {
    logger.warn('Authentication failed: Missing or invalid credentials', {
      ip: req.ip,
      url: req.url,
    });

    res.setHeader('WWW-Authenticate', 'Basic realm="Analytics Dashboard"');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  // Validate credentials
  const isValid = validateCredentials(
    credentials.username,
    credentials.password
  );

  if (!isValid) {
    logger.warn('Authentication failed: Invalid credentials', {
      ip: req.ip,
      url: req.url,
      username: credentials.username,
    });

    res.setHeader('WWW-Authenticate', 'Basic realm="Analytics Dashboard"');
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
    });
  }

  // Authentication successful
  logger.debug('Authentication successful', {
    username: credentials.username,
    url: req.url,
  });

  next();
}

module.exports = basicAuth;
