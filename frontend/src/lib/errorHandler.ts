/**
 * Error Handler Utility
 * Requirements: 7.2, 7.3
 */

import { ApiError } from "./api";

export interface FormattedError {
  title: string;
  message: string;
  isRetryable: boolean;
  retryAfter?: number; // seconds
}

/**
 * Format API error for user display with Indonesian-friendly messages
 * Requirements: 7.2, 7.3
 */
export function formatError(error: ApiError): FormattedError {
  // First check if backend provided a specific message
  const backendMessage = error.message;

  switch (error.status) {
    case 400:
      return {
        title: "Input Tidak Valid",
        message: backendMessage || "Mohon periksa input Anda dan coba lagi.",
        isRetryable: false,
      };

    case 401:
      return {
        title: "Autentikasi Diperlukan",
        message:
          backendMessage || "Username atau password salah. Silakan coba lagi.",
        isRetryable: false,
      };

    case 403:
      return {
        title: "Akses Ditolak",
        message:
          backendMessage ||
          "Anda tidak memiliki izin untuk melakukan aksi ini.",
        isRetryable: false,
      };

    case 404:
      return {
        title: "Tidak Ditemukan",
        message: backendMessage || "URL yang diminta tidak ditemukan.",
        isRetryable: false,
      };

    case 409:
      return {
        title: "Kode Sudah Digunakan",
        message:
          backendMessage ||
          "Custom code ini sudah digunakan. Silakan pilih kode lain.",
        isRetryable: false,
      };

    case 422:
      return {
        title: "Data Tidak Valid",
        message:
          backendMessage ||
          "Data yang dikirim tidak valid. Mohon periksa kembali.",
        isRetryable: false,
      };

    case 429: {
      const retryAfter = parseRetryAfter(error);
      return {
        title: "Terlalu Banyak Request",
        message: retryAfter
          ? `Mohon tunggu ${retryAfter} detik sebelum mencoba lagi.`
          : backendMessage ||
            "Anda telah membuat terlalu banyak request. Mohon tunggu sebentar.",
        isRetryable: true,
        retryAfter,
      };
    }

    case 500:
      return {
        title: "Server Error",
        message: "Terjadi kesalahan pada server. Silakan coba lagi nanti.",
        isRetryable: true,
      };

    case 502:
      return {
        title: "Bad Gateway",
        message:
          "Server sedang tidak dapat dijangkau. Silakan coba lagi nanti.",
        isRetryable: true,
      };

    case 503:
      return {
        title: "Layanan Tidak Tersedia",
        message: "Layanan sedang dalam pemeliharaan. Silakan coba lagi nanti.",
        isRetryable: true,
      };

    case 504:
      return {
        title: "Gateway Timeout",
        message:
          "Server membutuhkan waktu terlalu lama untuk merespons. Silakan coba lagi.",
        isRetryable: true,
      };

    case 0:
      // Network error
      if (error.code === "NETWORK_ERROR") {
        return {
          title: "Koneksi Gagal",
          message:
            "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
          isRetryable: true,
        };
      }
      if (error.code === "ABORTED") {
        return {
          title: "Request Dibatalkan",
          message: "Request telah dibatalkan.",
          isRetryable: true,
        };
      }
      return {
        title: "Error",
        message: backendMessage || "Terjadi kesalahan yang tidak terduga.",
        isRetryable: true,
      };

    default:
      return {
        title: "Error",
        message: backendMessage || "Terjadi kesalahan yang tidak terduga.",
        isRetryable: true,
      };
  }
}

/**
 * Get user-friendly error message from ApiError
 */
export function getErrorMessage(error: ApiError): string {
  return formatError(error).message;
}

/**
 * Get error title from ApiError
 */
export function getErrorTitle(error: ApiError): string {
  return formatError(error).title;
}

/**
 * Parse retry-after value from error
 */
function parseRetryAfter(error: ApiError): number | undefined {
  // Check if retryAfter is in error details
  if (error.details && typeof error.details === "object") {
    const details = error.details as Record<string, unknown>;
    if (typeof details.retryAfter === "number") {
      return details.retryAfter;
    }
    if (typeof details.retryAfterMs === "number") {
      return Math.ceil(details.retryAfterMs / 1000);
    }
  }

  // Try to parse from message (e.g., "Rate limit exceeded. Try again in 60 seconds")
  const match = error.message?.match(/(\d+)\s*(?:seconds?|detik)/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  return undefined;
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: ApiError): boolean {
  return error.status === 429;
}

/**
 * Check if error requires authentication
 */
export function isAuthError(error: ApiError): boolean {
  return error.status === 401;
}

/**
 * Check if error is a conflict (duplicate) error
 */
export function isConflictError(error: ApiError): boolean {
  return error.status === 409;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
  return formatError(error).isRetryable;
}
