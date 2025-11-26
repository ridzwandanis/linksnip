const mongoose = require('mongoose');

/**
 * Connect to MongoDB with retry logic and exponential backoff
 * @param {number} maxRetries - Maximum number of connection attempts
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<void>}
 */
async function connectDatabase(maxRetries = 5, initialDelay = 1000) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/url-shortener';
  
  // Connection pool configuration
  const options = {
    minPoolSize: 5,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  let retries = 0;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(mongoUri, options);
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      retries++;
      console.error(`MongoDB connection attempt ${retries} failed:`, error.message);
      
      if (retries >= maxRetries) {
        console.error('Max retries reached. Could not connect to MongoDB.');
        throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts`);
      }
      
      // Exponential backoff
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Double the delay for next retry
    }
  }
}

/**
 * Setup MongoDB connection event handlers
 */
function setupConnectionHandlers() {
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connection established');
  });

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
  });

  // Handle application termination
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      process.exit(1);
    }
  });
}

/**
 * Initialize database connection with event handlers
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
  setupConnectionHandlers();
  await connectDatabase();
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  await mongoose.connection.close();
}

/**
 * Check if database is connected
 * @returns {boolean}
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  initializeDatabase,
  connectDatabase,
  closeDatabase,
  isConnected,
  setupConnectionHandlers,
};
