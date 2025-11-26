const Joi = require('joi');

/**
 * Joi schema for URL validation
 * Requirements: 8.1, 8.2, 8.3
 */
const urlSchema = Joi.string()
  .uri({
    scheme: ['http', 'https'],
  })
  .max(2048)
  .required()
  .trim()
  .messages({
    'string.empty': 'URL cannot be empty',
    'string.uri': 'URL must be a valid HTTP or HTTPS URL',
    'string.uriCustomScheme': 'URL must use HTTP or HTTPS scheme',
    'string.max': 'URL cannot exceed 2048 characters',
    'any.required': 'URL is required',
  });

/**
 * Validates a URL against the defined schema
 * @param {string} url - The URL to validate
 * @returns {Object} - Validation result with isValid boolean and optional error message
 */
function validateUrl(url) {
  // Check for whitespace-only strings before joi validation
  if (typeof url === 'string' && url.trim().length === 0) {
    return {
      isValid: false,
      error: 'URL cannot be empty or whitespace only',
    };
  }

  // First validate with Joi schema
  const { error } = urlSchema.validate(url);

  if (error) {
    return {
      isValid: false,
      error: error.details[0].message,
    };
  }

  // Additional validation for edge cases that Joi might miss
  try {
    const urlObj = new URL(url);

    // Check for invalid hostnames
    if (
      !urlObj.hostname ||
      urlObj.hostname === '.' ||
      urlObj.hostname === '..' ||
      urlObj.hostname.startsWith('.') ||
      urlObj.hostname.endsWith('.') ||
      urlObj.hostname === '' ||
      urlObj.hostname.includes('..')
    ) {
      return {
        isValid: false,
        error: 'URL must have a valid hostname',
      };
    }

    // Check for URLs with only scheme and no meaningful content
    if (
      urlObj.href === `${urlObj.protocol}//` ||
      urlObj.href === `${urlObj.protocol}//${urlObj.pathname}`
    ) {
      return {
        isValid: false,
        error: 'URL must have a valid hostname',
      };
    }
  } catch (e) {
    // If URL constructor fails, it's invalid
    return {
      isValid: false,
      error: 'URL must be a valid HTTP or HTTPS URL',
    };
  }

  return {
    isValid: true,
  };
}

module.exports = {
  validateUrl,
  urlSchema,
};
