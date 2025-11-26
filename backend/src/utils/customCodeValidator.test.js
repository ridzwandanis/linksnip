/**
 * Unit tests for Custom Code Validator
 * Requirements: 3.3, 3.4, 3.5, 4.1, 4.2
 */

const {
  validateCustomCode,
  isReservedCode,
  normalizeCustomCode,
  RESERVED_CODES,
} = require('./customCodeValidator');

describe('customCodeValidator', () => {
  describe('validateCustomCode', () => {
    describe('valid inputs', () => {
      test('should accept valid alphanumeric code', () => {
        const result = validateCustomCode('mycode123');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      test('should accept code with hyphens', () => {
        const result = validateCustomCode('my-custom-code');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      test('should accept code with mixed case', () => {
        const result = validateCustomCode('MyCode123');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      test('should accept code at minimum length (3 characters)', () => {
        const result = validateCustomCode('abc');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      test('should accept code at maximum length (20 characters)', () => {
        const result = validateCustomCode('a'.repeat(20));
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });

    describe('invalid inputs', () => {
      test('should reject empty string', () => {
        const result = validateCustomCode('');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('non-empty');
      });

      test('should reject null', () => {
        const result = validateCustomCode(null);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('non-empty');
      });

      test('should reject undefined', () => {
        const result = validateCustomCode(undefined);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('non-empty');
      });

      test('should reject non-string input', () => {
        const result = validateCustomCode(123);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('non-empty');
      });
    });

    describe('length validation edge cases', () => {
      test('should reject code with 2 characters', () => {
        const result = validateCustomCode('ab');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('at least 3 characters');
        expect(result.code).toBe('INVALID_LENGTH');
      });

      test('should accept code with exactly 3 characters', () => {
        const result = validateCustomCode('abc');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      test('should accept code with exactly 20 characters', () => {
        const result = validateCustomCode('12345678901234567890');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      test('should reject code with 21 characters', () => {
        const result = validateCustomCode('123456789012345678901');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('at most 20 characters');
        expect(result.code).toBe('INVALID_LENGTH');
      });
    });

    describe('invalid character rejection', () => {
      test('should reject code with spaces', () => {
        const result = validateCustomCode('my code');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('alphanumeric characters and hyphens');
        expect(result.code).toBe('INVALID_CHARACTERS');
      });

      test('should reject code with underscores', () => {
        const result = validateCustomCode('my_code');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('alphanumeric characters and hyphens');
        expect(result.code).toBe('INVALID_CHARACTERS');
      });

      test('should reject code with special characters', () => {
        const result = validateCustomCode('my@code!');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('alphanumeric characters and hyphens');
        expect(result.code).toBe('INVALID_CHARACTERS');
      });

      test('should reject code with dots', () => {
        const result = validateCustomCode('my.code');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('alphanumeric characters and hyphens');
        expect(result.code).toBe('INVALID_CHARACTERS');
      });

      test('should reject code with slashes', () => {
        const result = validateCustomCode('my/code');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('alphanumeric characters and hyphens');
        expect(result.code).toBe('INVALID_CHARACTERS');
      });
    });

    describe('reserved word checking', () => {
      test('should reject "api" (reserved)', () => {
        const result = validateCustomCode('api');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('reserved');
        expect(result.code).toBe('RESERVED_CODE');
      });

      test('should reject "admin" (reserved)', () => {
        const result = validateCustomCode('admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('reserved');
        expect(result.code).toBe('RESERVED_CODE');
      });

      test('should reject "analytics" (reserved)', () => {
        const result = validateCustomCode('analytics');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('reserved');
        expect(result.code).toBe('RESERVED_CODE');
      });

      test('should reject reserved words case-insensitively', () => {
        const result = validateCustomCode('API');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('reserved');
        expect(result.code).toBe('RESERVED_CODE');
      });

      test('should reject reserved words with mixed case', () => {
        const result = validateCustomCode('Admin');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('reserved');
        expect(result.code).toBe('RESERVED_CODE');
      });

      test('should accept non-reserved words', () => {
        const result = validateCustomCode('myapi');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('isReservedCode', () => {
    test('should return true for reserved codes', () => {
      RESERVED_CODES.forEach((code) => {
        expect(isReservedCode(code)).toBe(true);
      });
    });

    test('should return true for reserved codes in uppercase', () => {
      expect(isReservedCode('API')).toBe(true);
      expect(isReservedCode('ADMIN')).toBe(true);
    });

    test('should return true for reserved codes in mixed case', () => {
      expect(isReservedCode('Api')).toBe(true);
      expect(isReservedCode('Admin')).toBe(true);
    });

    test('should return false for non-reserved codes', () => {
      expect(isReservedCode('mycode')).toBe(false);
      expect(isReservedCode('custom123')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isReservedCode('')).toBe(false);
    });

    test('should return false for null', () => {
      expect(isReservedCode(null)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(isReservedCode(undefined)).toBe(false);
    });
  });

  describe('normalizeCustomCode', () => {
    test('should convert to lowercase', () => {
      expect(normalizeCustomCode('MyCode')).toBe('mycode');
      expect(normalizeCustomCode('MYCODE')).toBe('mycode');
    });

    test('should trim whitespace', () => {
      expect(normalizeCustomCode('  mycode  ')).toBe('mycode');
      expect(normalizeCustomCode('\tmycode\n')).toBe('mycode');
    });

    test('should handle mixed case with hyphens', () => {
      expect(normalizeCustomCode('My-Custom-Code')).toBe('my-custom-code');
    });

    test('should return empty string for null', () => {
      expect(normalizeCustomCode(null)).toBe('');
    });

    test('should return empty string for undefined', () => {
      expect(normalizeCustomCode(undefined)).toBe('');
    });

    test('should return empty string for empty string', () => {
      expect(normalizeCustomCode('')).toBe('');
    });
  });
});
