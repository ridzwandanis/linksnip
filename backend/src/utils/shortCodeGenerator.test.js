const fc = require('fast-check');
const {
  generateShortCode,
  generateUniqueShortCode,
  URL_SAFE_ALPHABET,
} = require('./shortCodeGenerator');
const Url = require('../models/Url');

// Mock the Url model
jest.mock('../models/Url');

describe('Short Code Generator Property-Based Tests', () => {
  describe('generateShortCode', () => {
    test('generates codes with correct length', () => {
      const code = generateShortCode(6);
      expect(code).toHaveLength(6);
    });

    test('generates codes using URL-safe alphabet', () => {
      const code = generateShortCode(10);
      const allCharsValid = code
        .split('')
        .every((char) => URL_SAFE_ALPHABET.includes(char));
      expect(allCharsValid).toBe(true);
    });
  });

  describe('generateUniqueShortCode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    /**
     * **Feature: url-shortener, Property 1: Short code generation uniqueness**
     * **Validates: Requirements 1.1, 7.1**
     *
     * For any valid original URL, when creating a short URL, the system should generate
     * a unique short code that does not already exist in the database.
     */
    test('Property 1: Short code generation uniqueness', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 50 }), // Generate array of URLs
          async (originalUrls) => {
            // Track generated short codes in this test run
            const generatedCodes = new Set();
            const existingCodes = new Set();

            // Mock Url.findOne to check against our tracking sets
            Url.findOne = jest.fn(async ({ shortCode }) => {
              if (existingCodes.has(shortCode)) {
                return { shortCode, originalUrl: 'http://example.com' };
              }
              return null;
            });

            // Generate short codes for each URL
            for (const originalUrl of originalUrls) {
              const shortCode = await generateUniqueShortCode();

              // Verify the short code is unique (not in existing or previously generated)
              expect(generatedCodes.has(shortCode)).toBe(false);
              expect(existingCodes.has(shortCode)).toBe(false);

              // Verify the short code format
              expect(shortCode).toHaveLength(6);
              expect(
                shortCode
                  .split('')
                  .every((char) => URL_SAFE_ALPHABET.includes(char))
              ).toBe(true);

              // Add to tracking sets
              generatedCodes.add(shortCode);
              existingCodes.add(shortCode); // Simulate it being saved to DB
            }

            // Verify all codes are unique
            expect(generatedCodes.size).toBe(originalUrls.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('retries on collision and eventually succeeds', async () => {
      let callCount = 0;
      const collidingCode = 'abc123';

      // Mock to simulate collision on first 2 attempts, then success
      Url.findOne = jest.fn(async ({ shortCode }) => {
        callCount++;
        if (callCount <= 2 && shortCode === collidingCode) {
          return { shortCode, originalUrl: 'http://example.com' };
        }
        return null;
      });

      // This should succeed after retries
      const shortCode = await generateUniqueShortCode();
      expect(shortCode).toBeDefined();
      expect(shortCode).toHaveLength(6);
    });

    test('throws error after max retries exceeded', async () => {
      // Mock to always return a collision
      Url.findOne = jest.fn(async () => {
        return { shortCode: 'exists', originalUrl: 'http://example.com' };
      });

      // This should throw after 5 attempts
      await expect(generateUniqueShortCode(5)).rejects.toThrow(
        'Failed to generate unique short code after 5 attempts'
      );
    });
  });
});
