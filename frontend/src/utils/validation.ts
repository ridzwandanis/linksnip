/**
 * Validation Utilities
 * Requirements: 3.4
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate custom code for short URLs
 * Rules:
 * - Length: 3-20 characters
 * - Allowed characters: alphanumeric, hyphens, underscores
 * Requirements: 3.4
 */
export function validateCustomCode(code: string): ValidationResult {
  if (!code || code.trim() === "") {
    return {
      valid: false,
      error: "Custom code is required",
    };
  }

  const trimmedCode = code.trim();

  if (trimmedCode.length < 3) {
    return {
      valid: false,
      error: "Custom code must be at least 3 characters",
    };
  }

  if (trimmedCode.length > 20) {
    return {
      valid: false,
      error: "Custom code must be at most 20 characters",
    };
  }

  // Only allow alphanumeric, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmedCode)) {
    return {
      valid: false,
      error:
        "Custom code can only contain letters, numbers, hyphens, and underscores",
    };
  }

  return { valid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim() === "") {
    return {
      valid: false,
      error: "URL is required",
    };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: "Please enter a valid URL",
    };
  }
}
