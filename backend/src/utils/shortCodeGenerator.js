const { customAlphabet } = require('nanoid');
const Url = require('../models/Url');

/**
 * URL-safe alphabet: 0-9, A-Z, a-z
 */
const URL_SAFE_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Default length for short codes
 */
const DEFAULT_SHORT_CODE_LENGTH = 6;

/**
 * Maximum retry attempts for generating unique short codes
 */
const MAX_RETRY_ATTEMPTS = 5;

/**
 * Generate a short code using nanoid with custom alphabet
 * @param {number} length - Length of the short code (default: 6)
 * @returns {string} Generated short code
 */
function generateShortCode(length = DEFAULT_SHORT_CODE_LENGTH) {
  const nanoid = customAlphabet(URL_SAFE_ALPHABET, length);
  return nanoid();
}

/**
 * Generate a unique short code with collision detection
 * Checks database to ensure uniqueness and retries if collision occurs
 * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
 * @returns {Promise<string>} Unique short code
 * @throws {Error} If max retries exceeded
 */
async function generateUniqueShortCode(maxRetries = MAX_RETRY_ATTEMPTS) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const shortCode = generateShortCode();

    // Check if short code already exists in database
    const existingUrl = await Url.findOne({ shortCode });

    if (!existingUrl) {
      return shortCode;
    }

    // Collision detected, will retry
  }

  throw new Error(
    `Failed to generate unique short code after ${maxRetries} attempts`
  );
}

module.exports = {
  generateShortCode,
  generateUniqueShortCode,
  URL_SAFE_ALPHABET,
  DEFAULT_SHORT_CODE_LENGTH,
  MAX_RETRY_ATTEMPTS,
};
