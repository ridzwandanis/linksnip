/**
 * 404 Not Found Handler Middleware
 * Requirements: 2.2, 3.2, 4.2
 *
 * Catches all unmatched routes and returns a standardized 404 response
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
}

module.exports = notFoundHandler;
