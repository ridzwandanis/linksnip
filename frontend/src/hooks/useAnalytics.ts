/**
 * React Query Hooks for Analytics Operations
 * Requirements: 4.1, 4.2, 4.3
 */

import { useQuery } from "@tanstack/react-query";
import {
  getSystemAnalytics,
  getPopularUrls,
  getUrlAnalytics,
  SystemAnalytics,
  PopularUrl,
  UrlAnalytics,
  DateRangeOptions,
} from "@/services/analyticsService";
import { ApiResponse } from "@/lib/api";

export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * Hook for fetching system-wide analytics
 * Requirements: 4.1, 4.2
 */
export function useSystemAnalytics(
  credentials: AuthCredentials | null,
  options?: DateRangeOptions
) {
  return useQuery<ApiResponse<SystemAnalytics>>({
    queryKey: ["analytics", "system", options],
    queryFn: () => {
      if (!credentials) {
        return Promise.resolve({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            status: 401,
          },
        });
      }
      return getSystemAnalytics(credentials, options);
    },
    enabled: !!credentials,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook for fetching popular URLs
 * Requirements: 4.1
 */
export function usePopularUrls(
  credentials: AuthCredentials | null,
  limit: number = 10
) {
  return useQuery<ApiResponse<PopularUrl[]>>({
    queryKey: ["analytics", "popular", limit],
    queryFn: () => {
      if (!credentials) {
        return Promise.resolve({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            status: 401,
          },
        });
      }
      return getPopularUrls(credentials, limit);
    },
    enabled: !!credentials,
    staleTime: 30000,
  });
}

/**
 * Hook for fetching URL-specific analytics
 * Requirements: 4.3
 */
export function useUrlAnalytics(
  shortCode: string | null,
  credentials: AuthCredentials | null,
  options?: DateRangeOptions
) {
  return useQuery<ApiResponse<UrlAnalytics>>({
    queryKey: ["analytics", "url", shortCode, options],
    queryFn: () => {
      if (!credentials || !shortCode) {
        return Promise.resolve({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
            status: 401,
          },
        });
      }
      return getUrlAnalytics(shortCode, credentials, options);
    },
    enabled: !!credentials && !!shortCode,
    staleTime: 30000,
  });
}
