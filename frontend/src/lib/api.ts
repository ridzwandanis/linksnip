/**
 * API Client Module
 * Handles all HTTP requests to the backend API
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

// Get base URL from environment variable or default to localhost:3000
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Parse error response from backend or network error
 */
function parseError(error: unknown, status?: number): ApiError {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return {
        code: "ABORTED",
        message: "Request was cancelled",
        status: 0,
      };
    }
    if (error.message === "Failed to fetch") {
      return {
        code: "NETWORK_ERROR",
        message: "Unable to connect to server. Please check your connection.",
        status: 0,
      };
    }
  }

  return {
    code: "UNKNOWN_ERROR",
    message:
      error instanceof Error ? error.message : "An unexpected error occurred",
    status: status || 500,
  };
}

/**
 * Make HTTP request with proper headers and error handling
 */
async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith("/")
    ? `${API_BASE_URL}${endpoint}`
    : `${API_BASE_URL}/${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.error?.code || `HTTP_${response.status}`,
          message:
            data.error?.message ||
            data.message ||
            `Request failed with status ${response.status}`,
          status: response.status,
          details: data.error?.details,
        },
      };
    }

    return {
      success: true,
      data: data.data || data,
    };
  } catch (error) {
    return {
      success: false,
      error: parseError(error),
    };
  }
}

/**
 * API Client with typed methods
 */
export const api = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return request<T>("GET", endpoint, undefined, options);
  },

  post<T>(
    endpoint: string,
    body: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return request<T>("POST", endpoint, body, options);
  },

  put<T>(
    endpoint: string,
    body: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return request<T>("PUT", endpoint, body, options);
  },

  delete<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return request<T>("DELETE", endpoint, undefined, options);
  },
};

/**
 * Create authenticated API client with Basic Auth
 */
export function createAuthenticatedApi(username: string, password: string) {
  const authHeader = `Basic ${btoa(`${username}:${password}`)}`;

  return {
    get<T>(
      endpoint: string,
      options?: RequestOptions
    ): Promise<ApiResponse<T>> {
      return request<T>("GET", endpoint, undefined, {
        ...options,
        headers: { ...options?.headers, Authorization: authHeader },
      });
    },

    post<T>(
      endpoint: string,
      body: unknown,
      options?: RequestOptions
    ): Promise<ApiResponse<T>> {
      return request<T>("POST", endpoint, body, {
        ...options,
        headers: { ...options?.headers, Authorization: authHeader },
      });
    },

    put<T>(
      endpoint: string,
      body: unknown,
      options?: RequestOptions
    ): Promise<ApiResponse<T>> {
      return request<T>("PUT", endpoint, body, {
        ...options,
        headers: { ...options?.headers, Authorization: authHeader },
      });
    },

    delete<T>(
      endpoint: string,
      options?: RequestOptions
    ): Promise<ApiResponse<T>> {
      return request<T>("DELETE", endpoint, undefined, {
        ...options,
        headers: { ...options?.headers, Authorization: authHeader },
      });
    },
  };
}

export default api;
