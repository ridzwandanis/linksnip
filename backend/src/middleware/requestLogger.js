const morgan = require('morgan');
const logger = require('../config/logger');

// Define custom token for logging request body (for debugging)
morgan.token('body', (req) => {
  return req.body ? JSON.stringify(req.body) : '';
});

// Create morgan middleware with combined format
// Combined format includes: :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
const requestLogger = morgan('combined', {
  stream: logger.stream,
  skip: (req, res) => {
    // Skip logging for health check endpoint in production to reduce noise
    return process.env.NODE_ENV === 'production' && req.url === '/health';
  },
});

// Alternative format for development with more details
const devRequestLogger = morgan(
  ':method :url :status :response-time ms - :res[content-length]',
  {
    stream: logger.stream,
  }
);

// Export the appropriate logger based on environment
module.exports =
  process.env.NODE_ENV === 'production' ? requestLogger : devRequestLogger;
