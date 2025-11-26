/**
 * Custom Code Validator
 * Validates custom short codes according to requirements 3.3, 3.4, 3.5, 4.1, 4.2
 */

/**
 * Reserved codes that cannot be used as custom short codes
 * These are system routes and common paths that should not be overridden
 */
const RESERVED_CODES = [
  'api',
  'health',
  'admin',
  'analytics',
  'dashboard',
  'stats',
  'docs',
  'help',
  'about',
  'contact',
  'terms',
  'privacy',
];

/**
 * Validate a custom short code
 * @param {string} code - The custom code to validate
 * @returns {Object} { isValid: boolean, error: string|null, code: string|null }
 */
function validateCustomCode(code) {
  // Check if code is provided
  if (!code || typeof code !== 'string') {
    return {
      isValid: false,
      error: 'Custom code must be a non-empty string',
      code: 'INVALID_INPUT',
    };
  }

  // Trim whitespace
  const trimmedCode = code.trim();

  // Check length - must be between 3 and 20 characters (Requirements 3.4, 3.5)
  if (trimmedCode.length < 3) {
    return {
      isValid: false,
      error: 'Custom code must be at least 3 characters long',
      code: 'INVALID_LENGTH',
    };
  }

  if (trimmedCode.length > 20) {
    return {
      isValid: false,
      error: 'Custom code must be at most 20 characters long',
      code: 'INVALID_LENGTH',
    };
  }

  // Check for valid characters - only alphanumeric and hyphens (Requirements 3.3, 4.1)
  const validCharactersRegex = /^[a-zA-Z0-9-]+$/;
  if (!validCharactersRegex.test(trimmedCode)) {
    return {
      isValid: false,
      error: 'Custom code can only contain alphanumeric characters and hyphens',
      code: 'INVALID_CHARACTERS',
    };
  }

  // Check if code is reserved (Requirement 4.2)
  if (isReservedCode(trimmedCode)) {
    return {
      isValid: false,
      error: `Custom code '${trimmedCode.toLowerCase()}' is reserved and cannot be used`,
      code: 'RESERVED_CODE',
    };
  }

  return {
    isValid: true,
    error: null,
    code: null,
  };
}

/**
 * Check if a code is in the reserved list (case-insensitive)
 * @param {string} code - The code to check
 * @returns {boolean} True if the code is reserved
 */
function isReservedCode(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  return RESERVED_CODES.includes(code.toLowerCase());
}

/**
 * Normalize a custom code to lowercase (Requirement 4.4)
 * @param {string} code - The code to normalize
 * @returns {string} Lowercase version of the code
 */
function normalizeCustomCode(code) {
  if (!code || typeof code !== 'string') {
    return '';
  }
  return code.trim().toLowerCase();
}

module.exports = {
  validateCustomCode,
  isReservedCode,
  normalizeCustomCode,
  RESERVED_CODES,
};
