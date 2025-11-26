const Url = require('../models/Url');
const { validateUrl } = require('../utils/urlValidator');
const { generateUniqueShortCode } = require('../utils/shortCodeGenerator');
const { ValidationError, ConflictError } = require('../middleware/errors');
const {
  validateCustomCode,
  normalizeCustomCode,
} = require('../utils/customCodeValidator');

/**
 * URL Service - Business logic for URL operations
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.4, 3.1, 3.3, 4.1
 */
class UrlService {
  /**
   * Create a short URL from an original URL
   * @param {string} originalUrl - The original URL to shorten
   * @param {Object} metadata - Optional metadata (userAgent, ipAddress)
   * @param {string} customCode - Optional custom short code
   * @returns {Promise<Object>} Created URL document with formatted response
   * @throws {ValidationError} If validation fails or custom code is invalid
   * @throws {ConflictError} If custom code already exists
   */
  async createShortUrl(originalUrl, metadata = {}, customCode = null) {
    // Validate input URL
    const validation = validateUrl(originalUrl);
    if (!validation.isValid) {
      throw new ValidationError(validation.error);
    }

    let shortCode;
    let isCustomCode = false;

    // Handle custom code if provided
    if (customCode) {
      // Validate custom code
      const customCodeValidation = validateCustomCode(customCode);
      if (!customCodeValidation.isValid) {
        throw new ValidationError(customCodeValidation.error);
      }

      // Normalize to lowercase (Requirement 4.4)
      shortCode = normalizeCustomCode(customCode);

      // Check for case-insensitive uniqueness (Requirement 4.3)
      const exists = await this._customCodeExists(shortCode);
      if (exists) {
        throw new ConflictError(
          `Custom code '${shortCode}' is already in use`,
          'CODE_EXISTS'
        );
      }

      isCustomCode = true;
    } else {
      // Generate unique random short code (Requirement 3.6)
      shortCode = await generateUniqueShortCode();
    }

    // Create URL document with metadata
    const urlDocument = new Url({
      shortCode,
      originalUrl,
      customCode: isCustomCode,
      metadata: {
        userAgent: metadata.userAgent || undefined,
        ipAddress: metadata.ipAddress || undefined,
      },
    });

    // Save to database
    await urlDocument.save();

    // Return formatted response
    return {
      shortCode: urlDocument.shortCode,
      shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${urlDocument.shortCode}`,
      originalUrl: urlDocument.originalUrl,
      createdAt: urlDocument.createdAt,
    };
  }

  /**
   * Check if custom code already exists (case-insensitive)
   * @param {string} code - Code to check
   * @returns {Promise<boolean>} True if exists
   * @private
   */
  async _customCodeExists(code) {
    const existingUrl = await Url.findOne({
      shortCode: new RegExp(`^${code}$`, 'i'),
    });
    return existingUrl !== null;
  }

  /**
   * Get the original URL for a given short code
   * @param {string} shortCode - The short code to look up
   * @returns {Promise<string|null>} Original URL or null if not found/inactive
   */
  async getOriginalUrl(shortCode) {
    // Query database by short code
    const urlDocument = await Url.findOne({ shortCode });

    // Check if URL exists and is active
    if (!urlDocument || !urlDocument.isActive) {
      return null;
    }

    // Return original URL
    return urlDocument.originalUrl;
  }

  /**
   * Get complete URL information for a given short code
   * @param {string} shortCode - The short code to look up
   * @returns {Promise<Object|null>} Complete URL information or null if not found
   */
  async getUrlInfo(shortCode) {
    // Query database by short code
    const urlDocument = await Url.findOne({ shortCode });

    if (!urlDocument) {
      return null;
    }

    // Return complete URL information with all metadata fields
    return {
      shortCode: urlDocument.shortCode,
      originalUrl: urlDocument.originalUrl,
      createdAt: urlDocument.createdAt,
      updatedAt: urlDocument.updatedAt,
      clicks: urlDocument.clicks,
      isActive: urlDocument.isActive,
      metadata: urlDocument.metadata,
    };
  }

  /**
   * Delete a URL mapping
   * @param {string} shortCode - The short code to delete
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteUrl(shortCode) {
    // Query database by short code and delete
    const result = await Url.deleteOne({ shortCode });

    // Return success status
    return result.deletedCount > 0;
  }
}

module.exports = new UrlService();
