const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/AnalyticsService');
const basicAuth = require('../middleware/basicAuth');
const { NotFoundError } = require('../middleware/errors');

/**
 * Analytics Routes
 * All routes protected with HTTP Basic Authentication
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.1
 */

/**
 * GET /api/analytics/urls/:shortcode
 * Get analytics for a specific short code
 * Requirements: 6.1, 6.2, 6.3, 6.4, 10.1
 */
router.get(
  '/api/analytics/urls/:shortcode',
  basicAuth,
  async (req, res, next) => {
    try {
      const { shortcode } = req.params;
      const { startDate, endDate } = req.query;

      // Build options for time range filtering (Requirement 6.3)
      const options = {};
      if (startDate) {
        options.startDate = startDate;
      }
      if (endDate) {
        options.endDate = endDate;
      }

      // Get analytics from service
      const analytics = await AnalyticsService.getUrlAnalytics(
        shortcode,
        options
      );

      // Return 404 if URL not found (Requirement 6.4)
      if (!analytics) {
        throw new NotFoundError('Short URL not found');
      }

      // Return analytics data (Requirements 6.1, 6.2)
      return res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/system
 * Get system-wide analytics
 * Requirements: 6.5, 10.1
 */
router.get('/api/analytics/system', basicAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build options for time range filtering
    const options = {};
    if (startDate) {
      options.startDate = startDate;
    }
    if (endDate) {
      options.endDate = endDate;
    }

    // Get system analytics from service
    const analytics = await AnalyticsService.getSystemAnalytics(options);

    // Return system analytics (Requirement 6.5)
    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/popular
 * Get most popular URLs
 * Requirements: 6.5, 10.1
 */
router.get('/api/analytics/popular', basicAuth, async (req, res, next) => {
  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    // Get popular URLs from service
    const popularUrls = await AnalyticsService.getPopularUrls(limitNum);

    // Return popular URLs
    return res.status(200).json({
      success: true,
      data: popularUrls,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
