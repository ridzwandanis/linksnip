const express = require('express');
const router = express.Router();
const UrlService = require('../services/UrlService');
const Url = require('../models/Url');
const AnalyticsService = require('../services/AnalyticsService');
const { ValidationError, NotFoundError } = require('../middleware/errors');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Create rate limiter instance
const rateLimiter = createRateLimiter();

/**
 * POST /api/shorten
 * Create a short URL from an original URL with optional custom code
 * Requirements: 1.1, 1.5, 3.1, 5.1, 5.2
 */
router.post(
  '/api/shorten',
  rateLimiter.middleware(),
  async (req, res, next) => {
    try {
      const { url, customCode } = req.body;

      // Validate request body
      if (!url) {
        throw new ValidationError('URL is required');
      }

      // Extract metadata from request
      const metadata = {
        userAgent: req.get('user-agent'),
        ipAddress: req.ip,
      };

      // Call UrlService.createShortUrl() with optional customCode
      const result = await UrlService.createShortUrl(url, metadata, customCode);

      // Return 201 with short URL data
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /:shortcode
 * Redirect to original URL and record analytics asynchronously
 * Requirements: 1.5, 5.1, 5.2
 * Note: This endpoint is NOT rate limited (Requirement 1.5)
 */
router.get('/:shortcode', async (req, res, next) => {
  try {
    const { shortcode } = req.params;

    // Call UrlService.getOriginalUrl()
    const originalUrl = await UrlService.getOriginalUrl(shortcode);

    // Return 404 if not found
    if (!originalUrl) {
      throw new NotFoundError('Short URL not found or inactive');
    }

    // Increment click counter (backward compatibility)
    await Url.findOneAndUpdate(
      { shortCode: shortcode },
      { $inc: { clicks: 1 } }
    );

    // Record analytics asynchronously (Requirement 5.2)
    // Don't await - let it run in background
    setImmediate(() => {
      AnalyticsService.recordClick(shortcode, {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        referrer: req.get('referer') || req.get('referrer'),
      });
    });

    // Redirect with 301 status immediately
    return res.redirect(301, originalUrl);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/urls/:shortcode
 * Get URL information with analytics summary
 * Requirements: 3.1, 3.2, 3.3, 5.1
 */
router.get('/api/urls/:shortcode', async (req, res, next) => {
  try {
    const { shortcode } = req.params;

    // Call UrlService.getUrlInfo()
    const urlInfo = await UrlService.getUrlInfo(shortcode);

    // Return 404 if not found
    if (!urlInfo) {
      throw new NotFoundError('Short URL not found');
    }

    // Add analytics summary to response
    const response = {
      ...urlInfo,
      analytics: urlInfo.analytics || {
        totalClicks: 0,
        uniqueVisitors: 0,
        lastClickAt: null,
        topReferrers: [],
        clicksByDay: [],
      },
    };

    // Return 200 with URL info including analytics
    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/urls/:shortcode
 * Delete a URL mapping
 * Requirements: 4.1, 4.2, 4.3
 */
router.delete('/api/urls/:shortcode', async (req, res, next) => {
  try {
    const { shortcode } = req.params;

    // Call UrlService.deleteUrl()
    const deleted = await UrlService.deleteUrl(shortcode);

    // Return 404 if not found
    if (!deleted) {
      throw new NotFoundError('Short URL not found');
    }

    // Return 200 with success message
    return res.status(200).json({
      success: true,
      message: 'URL deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
