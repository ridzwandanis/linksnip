/**
 * Health Check Routes
 * Provides health status endpoint for monitoring
 * Requirements: 6.3
 */

const express = require('express');
const router = express.Router();
const { isConnected } = require('../config/database');

/**
 * GET /health
 * Check server and database health status
 */
router.get('/health', async (req, res) => {
  try {
    // Check server status (if we're here, server is running)
    const serverStatus = 'ok';

    // Verify database connection
    const dbConnected = isConnected();
    const dbStatus = dbConnected ? 'connected' : 'disconnected';

    // Determine overall health
    const isHealthy = dbConnected;
    const statusCode = isHealthy ? 200 : 503;

    // Return health status
    return res.status(statusCode).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      server: serverStatus,
      database: dbStatus,
      uptime: process.uptime(),
    });
  } catch (error) {
    // If health check itself fails, return 503
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

module.exports = router;
