/**
 * Type definitions for error handling in the frontend
 */

/**
 * Standard API error response format from the backend
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
  [key: string]: unknown;
}

/**
 * HTTP error with response data
 */
export interface ApiError extends Error {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
  };
}

/**
 * Type guard to check if error is an API error with response
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    'response' in error &&
    typeof (error as ApiError).response === 'object'
  );
}

/**
 * Extract user-friendly error message from any error
 * Handles both API errors and generic errors
 */
export function getErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  // Check if it's an API error with response data
  if (isApiError(error) && error.response?.data?.error) {
    const { error: errorMsg, details } = error.response.data;
    return details ? `${errorMsg}: ${details}` : errorMsg;
  }
  
  // Check if it's a regular Error
  if (error instanceof Error) {
    return error.message;
  }
  
  // Check if it's a string
  if (typeof error === 'string') {
    return error;
  }
  
  return fallback;
}

/**
 * Extract just the error field from API response (no details)
 */
export function getErrorTitle(error: unknown, fallback = 'An error occurred'): string {
  if (isApiError(error) && error.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return fallback;
}
