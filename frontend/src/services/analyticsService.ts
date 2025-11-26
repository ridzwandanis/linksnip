/**
 * Analytics Service
 * Handles analytics operations with the backend API
 * Requirements: 4.1, 4.3, 4.4
 */

import { createAuthenticatedApi, ApiResponse } from "@/lib/api";

export interface UrlAnalytics {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  uniqueVisitors: number;
  lastClickAt: string | null;
  topReferrers: Array<{ referrer: string; count: number }>;
  clicksByDay: Array<{ date: string; clicks: number }>;
}

export interface SystemAnalytics {
  totalUrls: number;
  totalClicks: number;
  activeUrls: number;
  clicksToday: number;
  clicksThisWeek: number;
  clicksThisMonth: number;
}

export interface PopularUrl {
  shortCode: string;
  originalUrl: string;
  clicks: number;
  totalClicks: number;
  uniqueVisitors: number;
  createdAt: string;
}

export interface DateRangeOptions {
  startDate?: string;
  endDate?: string;
}

/**
 * Get analytics for a specific URL
 * GET /api/analytics/urls/:shortCode
 * Requirements: 4.3
 */
export async function getUrlAnalytics(
  shortCode: string,
  credentials: { username: string; password: string },
  options?: DateRangeOptions
): Promise<ApiResponse<UrlAnalytics>> {
  const api = createAuthenticatedApi(
    credentials.username,
    credentials.password
  );

  let endpoint = `/api/analytics/urls/${shortCode}`;
  const params = new URLSearchParams();

  if (options?.startDate) {
    params.append("startDate", options.startDate);
  }
  if (options?.endDate) {
    params.append("endDate", options.endDate);
  }

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  return api.get<UrlAnalytics>(endpoint);
}

/**
 * Get system-wide analytics
 * GET /api/analytics/system
 * Requirements: 4.1
 */
export async function getSystemAnalytics(
  credentials: { username: string; password: string },
  options?: DateRangeOptions
): Promise<ApiResponse<SystemAnalytics>> {
  const api = createAuthenticatedApi(
    credentials.username,
    credentials.password
  );

  let endpoint = "/api/analytics/system";
  const params = new URLSearchParams();

  if (options?.startDate) {
    params.append("startDate", options.startDate);
  }
  if (options?.endDate) {
    params.append("endDate", options.endDate);
  }

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  return api.get<SystemAnalytics>(endpoint);
}

/**
 * Get popular URLs
 * GET /api/analytics/popular
 * Requirements: 4.1
 */
export async function getPopularUrls(
  credentials: { username: string; password: string },
  limit: number = 10
): Promise<ApiResponse<PopularUrl[]>> {
  const api = createAuthenticatedApi(
    credentials.username,
    credentials.password
  );
  return api.get<PopularUrl[]>(`/api/analytics/popular?limit=${limit}`);
}

export const analyticsService = {
  getUrlAnalytics,
  getSystemAnalytics,
  getPopularUrls,
};

export default analyticsService;
