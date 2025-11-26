const fc = require('fast-check');
const { validateUrl } = require('./urlValidator');

describe('URL Validator Property-Based Tests', () => {
  describe('validateUrl', () => {
    test('accepts valid HTTP and HTTPS URLs', () => {
      const validUrl = 'https://example.com/path?query=value';
      const result = validateUrl(validUrl);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('rejects empty strings', () => {
      const result = validateUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('rejects whitespace-only strings', () => {
      const result = validateUrl('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL cannot be empty or whitespace only');
    });

    /**
     * **Feature: url-shortener, Property 4: Invalid URL rejection**
     * **Validates: Requirements 1.4, 1.5, 8.1, 8.2**
     *
     * For any invalid URL format (including empty strings, malformed URLs, or URLs with
     * invalid characters), the system should reject the request and return a validation
     * error with 400 status code.
     */
    test('Property 4: Invalid URL rejection', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Empty strings
            fc.constant(''),
            // Whitespace-only strings
            fc.stringOf(fc.constantFrom(' ', '\t', '\n'), {
              minLength: 1,
              maxLength: 10,
            }),
            // Strings without protocol
            fc.constant('example.com'),
            fc.constant('www.example.com/path'),
            // Invalid protocols
            fc
              .tuple(
                fc.constantFrom('ftp', 'file', 'mailto', 'javascript'),
                fc.webUrl()
              )
              .map(([protocol, url]) =>
                url.replace(/^https?:/, `${protocol}:`)
              ),
            // URLs that are too long (> 2048 characters)
            fc
              .webUrl()
              .chain((baseUrl) =>
                fc
                  .stringOf(fc.char(), {
                    minLength: 2049 - baseUrl.length,
                    maxLength: 3000,
                  })
                  .map((extra) => baseUrl + '/' + extra)
              ),
            // Malformed URLs
            fc.constant('http://'),
            fc.constant('https://'),
            fc.constant('not a url at all'),
            fc.constant('http:// invalid space.com'),
            // URLs with invalid characters in domain
            fc
              .tuple(
                fc.constantFrom('http://', 'https://'),
                fc.stringOf(
                  fc.constantFrom('<', '>', '{', '}', '|', '\\', '^', '`'),
                  { minLength: 1, maxLength: 10 }
                )
              )
              .map(([protocol, chars]) => `${protocol}${chars}.com`)
          ),
          async (invalidUrl) => {
            const result = validateUrl(invalidUrl);

            // All invalid URLs should be rejected
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('accepts valid URLs with various formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          async (validUrl) => {
            // Ensure URL is not too long
            if (validUrl.length > 2048) {
              return; // Skip this test case
            }

            const result = validateUrl(validUrl);

            // All valid URLs should be accepted
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('rejects URLs exceeding maximum length', () => {
      // Create a URL that's exactly 2049 characters (1 over the limit)
      const longPath = 'a'.repeat(2049 - 'https://example.com/'.length);
      const longUrl = `https://example.com/${longPath}`;

      const result = validateUrl(longUrl);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('2048');
    });

    test('rejects non-HTTP/HTTPS protocols', () => {
      const ftpUrl = 'ftp://example.com';
      const result = validateUrl(ftpUrl);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
