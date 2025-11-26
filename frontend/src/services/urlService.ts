/**
 * URL Service
 * Handles URL shortening operations with the backend API
 * Requirements: 2.1, 3.1, 5.3
 */

import { api, ApiResponse } from "@/lib/api";

export interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  clicks: number;
  createdAt: string;
  updatedAt?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
  };
  analytics?: {
    totalClicks: number;
    uniqueVisitors: number;
    lastClickAt: string | null;
    topReferrers: Array<{ referrer: string; count: number }>;
    clicksByDay: Array<{ date: string; clicks: number }>;
  };
}

export interface ShortenUrlRequest {
  url: string;
  customCode?: string;
}

/**
 * Shorten a URL with optional custom code
 * POST /api/shorten
 * Requirements: 2.1
 */
export async function shortenUrl(
  request: ShortenUrlRequest
): Promise<ApiResponse<ShortenedUrl>> {
  return api.post<ShortenedUrl>("/api/shorten", request);
}

/**
 * Get URL information by short code
 * GET /api/urls/:shortCode
 * Requirements: 5.1
 */
export async function getUrlInfo(
  shortCode: string
): Promise<ApiResponse<ShortenedUrl>> {
  return api.get<ShortenedUrl>(`/api/urls/${shortCode}`);
}

/**
 * Delete a URL by short code
 * DELETE /api/urls/:shortCode
 * Requirements: 5.3
 */
export async function deleteUrl(
  shortCode: string
): Promise<ApiResponse<{ message: string }>> {
  return api.delete<{ message: string }>(`/api/urls/${shortCode}`);
}

export const urlService = {
  shortenUrl,
  getUrlInfo,
  deleteUrl,
};

export default urlService;
