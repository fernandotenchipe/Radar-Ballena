/**
 * Security types and utilities for RadarBallena
 * Defines the contract between frontend and backend for secure authentication
 */

/**
 * CSRF Token response from backend
 * Endpoint: GET /api/csrf-token
 */
export type CsrfTokenResponse = {
  token: string;
};

/**
 * Login request to backend
 * Endpoint: POST /api/auth/login
 */
export type LoginRequest = {
  email: string;
  password: string;
};

/**
 * Login response from backend
 * NOTE: Token is NOT in this response
 * It's stored in httpOnly cookie by the backend
 */
export type LoginResponse = {
  ok: boolean;
  error?: string;
  user?: {
    email: string;
    role?: string;
  };
};

/**
 * Logout response from backend
 * Endpoint: POST /api/auth/logout
 */
export type LogoutResponse = {
  ok: boolean;
  error?: string;
};

/**
 * Register/Create account response
 * Endpoint: POST /api/auth/register or /api/invite/complete
 */
export type RegisterResponse = {
  ok: boolean;
  error?: string;
  user?: {
    email: string;
    role?: string;
  };
};

/**
 * Error response from API
 * All endpoints should return errors in this format
 */
export type ApiErrorResponse = {
  ok: false;
  error: string;
  status?: number;
};

/**
 * Generic success response
 */
export type ApiSuccessResponse<T = unknown> = {
  ok: true;
  data?: T;
};

/**
 * Configuration constants for security
 */
export const SECURITY_CONFIG = {
  /**
   * Session inactivity timeout (must match backend)
   * Set to 2 hours
   */
  SESSION_INACTIVITY_MS: 2 * 60 * 60 * 1000,

  /**
   * Request timeout for API calls
   * Prevents hanging requests
   */
  REQUEST_TIMEOUT_MS: 8000,

  /**
   * CSRF token header name
   */
  CSRF_HEADER: "X-CSRF-Token",

  /**
   * CSRF token session storage key
   * Stored in sessionStorage instead of localStorage for better security
   */
  CSRF_SESSION_KEY: "csrf-token",

  /**
   * Auth cookie name (httpOnly, managed by backend)
   */
  AUTH_COOKIE_NAME: "auth-token",

  /**
   * Credentials mode for fetch
   * Must be 'include' to send/receive cookies
   */
  FETCH_CREDENTIALS: "include" as const,
};

/**
 * Helper function to handle API responses safely
 * Always validates response type before using
 */
export function validateApiResponse<T>(
  response: unknown,
  expectedFields?: Array<keyof T>
): response is T {
  if (!response || typeof response !== "object") {
    return false;
  }

  if (expectedFields) {
    return expectedFields.every((field) => field in response);
  }

  return true;
}

/**
 * Helper to check if response is an error
 */
export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    response !== null &&
    typeof response === "object" &&
    "ok" in response &&
    response.ok === false
  );
}
