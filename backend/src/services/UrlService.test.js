const fc = require('fast-check');
const UrlService = require('./UrlService');
const Url = require('../models/Url');
const { generateUniqueShortCode } = require('../utils/shortCodeGenerator');
const { validateUrl } = require('../utils/urlValidator');
const {
  validateCustomCode,
  normalizeCustomCode,
} = require('../utils/customCodeValidator');

// Mock dependencies
jest.mock('../models/Url');
jest.mock('../utils/shortCodeGenerator');
jest.mock('../utils/urlValidator');
jest.mock('../utils/customCodeValidator');

describe('UrlService', () => {
  let savedUrls;

  beforeEach(() => {
    savedUrls = new Map();
    jest.clearAllMocks();

    // Mock validateUrl
    validateUrl.mockImplementation((url) => {
      if (!url || url.trim().length === 0) {
        return { isValid: false, error: 'URL cannot be empty' };
      }
      if (url.length > 2048) {
        return { isValid: false, error: 'URL cannot exceed 2048 characters' };
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return {
          isValid: false,
          error: 'URL must be a valid HTTP or HTTPS URL',
        };
      }
      return { isValid: true };
    });

    // Mock validateCustomCode
    const RESERVED_CODES = [
      'api',
      'health',
      'admin',
      'analytics',
      'dashboard',
      'stats',
      'docs',
      'help',
    ];
    validateCustomCode.mockImplementation((code) => {
      if (!code || typeof code !== 'string') {
        return {
          isValid: false,
          error: 'Custom code must be a non-empty string',
          code: 'INVALID_INPUT',
        };
      }
      const trimmedCode = code.trim();
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
      const validCharactersRegex = /^[a-zA-Z0-9-]+$/;
      if (!validCharactersRegex.test(trimmedCode)) {
        return {
          isValid: false,
          error:
            'Custom code can only contain alphanumeric characters and hyphens',
          code: 'INVALID_CHARACTERS',
        };
      }
      if (RESERVED_CODES.includes(trimmedCode.toLowerCase())) {
        return {
          isValid: false,
          error: `Custom code '${trimmedCode.toLowerCase()}' is reserved and cannot be used`,
          code: 'RESERVED_CODE',
        };
      }
      return { isValid: true, error: null, code: null };
    });

    // Mock normalizeCustomCode
    normalizeCustomCode.mockImplementation((code) => {
      if (!code || typeof code !== 'string') {
        return '';
      }
      return code.trim().toLowerCase();
    });

    // Mock generateUniqueShortCode
    let codeCounter = 0;
    generateUniqueShortCode.mockImplementation(async () => {
      codeCounter++;
      return `code${codeCounter.toString().padStart(3, '0')}`;
    });

    // Mock Url constructor and save
    Url.mockImplementation(function (data) {
      this.shortCode = data.shortCode;
      this.originalUrl = data.originalUrl;
      this.customCode = data.customCode || false;
      this.createdAt = new Date();
      this.updatedAt = new Date();
      this.clicks = 0;
      this.isActive = true;
      this.metadata = data.metadata || {};

      this.save = jest.fn(async () => {
        savedUrls.set(this.shortCode.toLowerCase(), {
          shortCode: this.shortCode,
          originalUrl: this.originalUrl,
          customCode: this.customCode,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt,
          clicks: this.clicks,
          isActive: this.isActive,
          metadata: this.metadata,
        });
        return this;
      });

      return this;
    });

    // Mock Url.findOne
    Url.findOne = jest.fn(async (query) => {
      if (query.shortCode instanceof RegExp) {
        // Case-insensitive search
        const pattern = query.shortCode.source
          .replace(/\^|\$/g, '')
          .replace(/\\\\/g, '');
        for (const [key, data] of savedUrls.entries()) {
          if (key === pattern.toLowerCase()) {
            return {
              ...data,
              incrementClicks: jest.fn(async function () {
                this.clicks += 1;
                savedUrls.set(key, { ...data, clicks: this.clicks });
              }),
            };
          }
        }
        return null;
      } else if (query.shortCode) {
        // Exact match
        const searchKey =
          typeof query.shortCode === 'string'
            ? query.shortCode.toLowerCase()
            : query.shortCode;
        const data = savedUrls.get(searchKey);
        if (!data) return null;
        return {
          ...data,
          incrementClicks: jest.fn(async function () {
            this.clicks += 1;
            savedUrls.set(searchKey, {
              ...data,
              clicks: this.clicks,
            });
          }),
        };
      }
      return null;
    });

    // Mock Url.deleteOne
    Url.deleteOne = jest.fn(async ({ shortCode }) => {
      const existed = savedUrls.has(shortCode.toLowerCase());
      savedUrls.delete(shortCode.toLowerCase());
      return { deletedCount: existed ? 1 : 0 };
    });
  });

  /**
   * **Feature: url-shortener, Property 3: Creation response completeness**
   * **Validates: Requirements 1.3**
   *
   * For any successful short URL creation, the response should contain
   * all required fields: short code, short URL, original URL, and creation timestamp.
   */
  describe('Property 3: Creation response completeness', () => {
    it('should return all required fields for any valid URL', async () => {
      // Generator for valid URLs
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      await fc.assert(
        fc.asyncProperty(validUrlArbitrary, async (originalUrl) => {
          // Ensure URL doesn't exceed max length
          if (originalUrl.length > 2048) {
            return true; // Skip URLs that are too long
          }

          const response = await UrlService.createShortUrl(originalUrl);

          // Verify all required fields are present
          expect(response).toHaveProperty('shortCode');
          expect(response).toHaveProperty('shortUrl');
          expect(response).toHaveProperty('originalUrl');
          expect(response).toHaveProperty('createdAt');

          // Verify field types
          expect(typeof response.shortCode).toBe('string');
          expect(typeof response.shortUrl).toBe('string');
          expect(typeof response.originalUrl).toBe('string');
          expect(response.createdAt).toBeInstanceOf(Date);

          // Verify field values
          expect(response.shortCode.length).toBeGreaterThanOrEqual(6);
          expect(response.shortUrl).toContain(response.shortCode);
          expect(response.originalUrl).toBe(originalUrl);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: url-shortener, Property 8: URL info retrieval completeness**
   * **Validates: Requirements 3.1, 3.3**
   *
   * For any valid short code in the database, retrieving URL info should return
   * all required fields: short code, original URL, creation timestamp, click count, and active status.
   */
  describe('Property 8: URL info retrieval completeness', () => {
    it('should return all required fields for any valid short code', async () => {
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      await fc.assert(
        fc.asyncProperty(validUrlArbitrary, async (originalUrl) => {
          // Ensure URL doesn't exceed max length
          if (originalUrl.length > 2048) {
            return true;
          }

          // Create a URL first
          const created = await UrlService.createShortUrl(originalUrl);

          // Retrieve URL info
          const urlInfo = await UrlService.getUrlInfo(created.shortCode);

          // Verify all required fields are present
          expect(urlInfo).toHaveProperty('shortCode');
          expect(urlInfo).toHaveProperty('originalUrl');
          expect(urlInfo).toHaveProperty('createdAt');
          expect(urlInfo).toHaveProperty('updatedAt');
          expect(urlInfo).toHaveProperty('clicks');
          expect(urlInfo).toHaveProperty('isActive');
          expect(urlInfo).toHaveProperty('metadata');

          // Verify field types
          expect(typeof urlInfo.shortCode).toBe('string');
          expect(typeof urlInfo.originalUrl).toBe('string');
          expect(urlInfo.createdAt).toBeInstanceOf(Date);
          expect(urlInfo.updatedAt).toBeInstanceOf(Date);
          expect(typeof urlInfo.clicks).toBe('number');
          expect(typeof urlInfo.isActive).toBe('boolean');
          expect(typeof urlInfo.metadata).toBe('object');

          // Verify field values
          expect(urlInfo.shortCode).toBe(created.shortCode);
          expect(urlInfo.originalUrl).toBe(originalUrl);
          expect(urlInfo.clicks).toBe(0);
          expect(urlInfo.isActive).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: url-shortener, Property 9: Deletion removes mapping**
   * **Validates: Requirements 4.1**
   *
   * For any valid short code in the database, after deletion,
   * querying the database for that short code should return null or not found.
   */
  describe('Property 9: Deletion removes mapping', () => {
    it('should remove mapping for any valid short code', async () => {
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      await fc.assert(
        fc.asyncProperty(validUrlArbitrary, async (originalUrl) => {
          // Ensure URL doesn't exceed max length
          if (originalUrl.length > 2048) {
            return true;
          }

          // Create a URL first
          const created = await UrlService.createShortUrl(originalUrl);

          // Delete the URL
          const deleted = await UrlService.deleteUrl(created.shortCode);

          // Verify deletion was successful
          expect(deleted).toBe(true);

          // Verify the mapping no longer exists
          const urlInfo = await UrlService.getUrlInfo(created.shortCode);
          expect(urlInfo).toBeNull();

          // Also verify getOriginalUrl returns null
          const originalUrlResult = await UrlService.getOriginalUrl(
            created.shortCode
          );
          expect(originalUrlResult).toBeNull();
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: url-enhancements, Property 7: Custom code usage**
   * **Validates: Requirements 3.1**
   *
   * For any valid custom short code provided in a URL creation request,
   * the system should use that code instead of generating a random one.
   */
  describe('Property 7: Custom code usage', () => {
    it('should use custom code instead of generating random one', async () => {
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      let iterationCounter = 0;
      // Generator for valid custom codes (3-20 alphanumeric + hyphens)
      const validCustomCodeArbitrary = fc
        .stringOf(
          fc.oneof(
            fc.char().filter((c) => /[a-zA-Z0-9-]/.test(c)),
            fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-')
          ),
          { minLength: 3, maxLength: 15 }
        )
        .filter((code) => {
          const reserved = [
            'api',
            'health',
            'admin',
            'analytics',
            'dashboard',
            'stats',
            'docs',
            'help',
          ];
          return !reserved.includes(code.toLowerCase());
        })
        .map((code) => {
          // Make each code unique by appending iteration counter
          return `${code}${iterationCounter++}`;
        });

      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          validCustomCodeArbitrary,
          async (originalUrl, customCode) => {
            // Ensure URL doesn't exceed max length
            if (originalUrl.length > 2048) {
              return true;
            }

            const response = await UrlService.createShortUrl(
              originalUrl,
              {},
              customCode
            );

            // Verify the custom code was used (normalized to lowercase)
            expect(response.shortCode).toBe(customCode.toLowerCase());
            expect(response.shortUrl).toContain(customCode.toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: url-enhancements, Property 8: Custom code uniqueness enforcement**
   * **Validates: Requirements 3.2**
   *
   * For any custom short code that already exists, attempting to create
   * another URL with the same code should be rejected with a 409 conflict error.
   */
  describe('Property 8: Custom code uniqueness enforcement', () => {
    it('should reject duplicate custom codes', async () => {
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      let iterationCounter = 0;
      const validCustomCodeArbitrary = fc
        .stringOf(
          fc.oneof(
            fc.char().filter((c) => /[a-zA-Z0-9-]/.test(c)),
            fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-')
          ),
          { minLength: 3, maxLength: 15 }
        )
        .filter((code) => {
          const reserved = [
            'api',
            'health',
            'admin',
            'analytics',
            'dashboard',
            'stats',
            'docs',
            'help',
          ];
          return !reserved.includes(code.toLowerCase());
        })
        .map((code) => {
          // Make each code unique by appending iteration counter
          return `${code}${iterationCounter++}`;
        });

      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          validUrlArbitrary,
          validCustomCodeArbitrary,
          async (url1, url2, customCode) => {
            // Ensure URLs don't exceed max length
            if (url1.length > 2048 || url2.length > 2048) {
              return true;
            }

            // Create first URL with custom code
            await UrlService.createShortUrl(url1, {}, customCode);

            // Attempt to create second URL with same custom code
            await expect(
              UrlService.createShortUrl(url2, {}, customCode)
            ).rejects.toThrow(/already in use/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: url-enhancements, Property 9: Invalid character rejection**
   * **Validates: Requirements 3.3, 4.1**
   *
   * For any custom short code containing characters other than alphanumeric and hyphens,
   * the creation request should be rejected with a validation error.
   */
  describe('Property 9: Invalid character rejection', () => {
    it('should reject custom codes with invalid characters', async () => {
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      // Generator for codes with invalid characters
      const invalidCustomCodeArbitrary = fc
        .string({ minLength: 3, maxLength: 20 })
        .filter((code) => {
          // Must contain at least one invalid character
          return /[^a-zA-Z0-9-]/.test(code);
        });

      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          invalidCustomCodeArbitrary,
          async (originalUrl, customCode) => {
            // Ensure URL doesn't exceed max length
            if (originalUrl.length > 2048) {
              return true;
            }

            // Attempt to create URL with invalid custom code
            await expect(
              UrlService.createShortUrl(originalUrl, {}, customCode)
            ).rejects.toThrow(/alphanumeric characters and hyphens/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: url-enhancements, Property 10: Reserved word rejection**
   * **Validates: Requirements 4.2**
   *
   * For any custom short code that matches a reserved word,
   * the creation request should be rejected with a validation error.
   */
  describe('Property 10: Reserved word rejection', () => {
    it('should reject reserved words as custom codes', async () => {
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      const reservedCodeArbitrary = fc.constantFrom(
        'api',
        'health',
        'admin',
        'analytics',
        'dashboard',
        'stats',
        'docs',
        'help'
      );

      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          reservedCodeArbitrary,
          async (originalUrl, reservedCode) => {
            // Ensure URL doesn't exceed max length
            if (originalUrl.length > 2048) {
              return true;
            }

            // Attempt to create URL with reserved code
            await expect(
              UrlService.createShortUrl(originalUrl, {}, reservedCode)
            ).rejects.toThrow(/reserved/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: url-enhancements, Property 11: Case-insensitive uniqueness**
   * **Validates: Requirements 4.3**
   *
   * For any custom short code, if a URL exists with that code in any case combination,
   * attempting to create another URL with a different case should be rejected.
   */
  describe('Property 11: Case-insensitive uniqueness', () => {
    it('should enforce case-insensitive uniqueness', async () => {
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      let iterationCounter = 0;
      const validCustomCodeArbitrary = fc
        .stringOf(
          fc.oneof(
            fc.char().filter((c) => /[a-zA-Z0-9-]/.test(c)),
            fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-')
          ),
          { minLength: 3, maxLength: 15 }
        )
        .filter((code) => {
          const reserved = [
            'api',
            'health',
            'admin',
            'analytics',
            'dashboard',
            'stats',
            'docs',
            'help',
          ];
          return !reserved.includes(code.toLowerCase());
        })
        .map((code) => {
          // Make each code unique by appending iteration counter
          return `${code}${iterationCounter++}`;
        });

      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          validUrlArbitrary,
          validCustomCodeArbitrary,
          async (url1, url2, customCode) => {
            // Ensure URLs don't exceed max length
            if (url1.length > 2048 || url2.length > 2048) {
              return true;
            }

            // Create first URL with custom code
            await UrlService.createShortUrl(url1, {}, customCode);

            // Create a different case version of the same code
            const differentCase =
              customCode === customCode.toUpperCase()
                ? customCode.toLowerCase()
                : customCode.toUpperCase();

            // Attempt to create second URL with different case
            await expect(
              UrlService.createShortUrl(url2, {}, differentCase)
            ).rejects.toThrow(/already in use/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: url-enhancements, Property 12: Lowercase normalization**
   * **Validates: Requirements 4.4**
   *
   * For any custom short code containing uppercase letters,
   * the stored short code should be converted to all lowercase.
   */
  describe('Property 12: Lowercase normalization', () => {
    it('should normalize custom codes to lowercase', async () => {
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      const mixedCaseCodeArbitrary = fc
        .stringOf(
          fc.oneof(
            fc.char().filter((c) => /[a-zA-Z0-9-]/.test(c)),
            fc.constantFrom('A', 'B', 'C', 'a', 'b', 'c', '1', '2', '3', '-')
          ),
          { minLength: 3, maxLength: 20 }
        )
        .filter((code) => {
          const reserved = [
            'api',
            'health',
            'admin',
            'analytics',
            'dashboard',
            'stats',
            'docs',
            'help',
          ];
          return (
            !reserved.includes(code.toLowerCase()) &&
            code !== code.toLowerCase()
          ); // Ensure it has uppercase
        });

      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          mixedCaseCodeArbitrary,
          async (originalUrl, customCode) => {
            // Ensure URL doesn't exceed max length
            if (originalUrl.length > 2048) {
              return true;
            }

            const response = await UrlService.createShortUrl(
              originalUrl,
              {},
              customCode
            );

            // Verify the code was normalized to lowercase
            expect(response.shortCode).toBe(customCode.toLowerCase());
            expect(response.shortCode).not.toBe(customCode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: url-enhancements, Property 13: Backward compatibility with random generation**
   * **Validates: Requirements 3.6**
   *
   * For any URL creation request without a custom code,
   * the system should generate a random short code as it did before the custom code feature.
   */
  describe('Property 13: Backward compatibility with random generation', () => {
    it('should generate random codes when no custom code provided', async () => {
      const validUrlArbitrary = fc.webUrl({
        validSchemes: ['http', 'https'],
        size: 'small',
      });

      await fc.assert(
        fc.asyncProperty(validUrlArbitrary, async (originalUrl) => {
          // Ensure URL doesn't exceed max length
          if (originalUrl.length > 2048) {
            return true;
          }

          // Create URL without custom code
          const response = await UrlService.createShortUrl(originalUrl);

          // Verify a code was generated
          expect(response.shortCode).toBeDefined();
          expect(typeof response.shortCode).toBe('string');
          expect(response.shortCode.length).toBeGreaterThanOrEqual(6);

          // Verify it matches the pattern of generated codes
          expect(response.shortCode).toMatch(/^code\d{3}$/);
        }),
        { numRuns: 100 }
      );
    });
  });
});
