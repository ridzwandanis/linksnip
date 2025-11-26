/**
 * Express Application Setup
 * Configures Express app with middleware, routes, and error handling
 * Requirements: 1.1, 10.1
 */

const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware');
const urlRoutes = require('./routes/urlRoutes');
const healthRoutes = require('./routes/healthRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

/**
 * Create and configure Express application
 * @returns {express.Application} Configured Express app
 */
function createApp() {
  const app = express();

  // Setup express.json() for body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add CORS support
  app.use(cors());

  // Add morgan for request logging
  app.use(requestLogger);

  // Mount health check routes (before other routes for priority)
  app.use('/', healthRoutes);

  // Mount analytics routes (before URL routes to ensure /api/analytics/* is matched first)
  // Analytics routes are protected with HTTP Basic Authentication (Requirement 10.1)
  app.use('/', analyticsRoutes);

  // Mount URL routes
  // Rate limiting is applied within urlRoutes for POST /api/shorten (Requirement 1.1)
  // GET /:shortcode redirects are NOT rate limited (Requirement 1.5)
  app.use('/', urlRoutes);

  // Add 404 not found handler (must be after all routes)
  app.use(notFoundHandler);

  // Add error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
