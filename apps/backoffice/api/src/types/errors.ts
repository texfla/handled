/**
 * Type definitions for error handling across the application
 */

/**
 * Standard API error response format
 * Matches the format defined in Priority 2
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
  [key: string]: unknown; // Allow additional domain-specific fields
}

/**
 * Prisma error with code property
 */
export interface PrismaError extends Error {
  code: string;
  meta?: {
    target?: string[];
    [key: string]: unknown;
  };
}

/**
 * Type guard to check if an error is a Prisma error
 */
export function isPrismaError(error: unknown): error is PrismaError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as PrismaError).code === 'string'
  );
}

/**
 * Type guard to check for unique constraint violation
 */
export function isPrismaUniqueConstraintError(error: unknown): error is PrismaError {
  return isPrismaError(error) && error.code === 'P2002';
}

/**
 * Type guard to check for foreign key constraint violation
 */
export function isPrismaForeignKeyError(error: unknown): error is PrismaError {
  return isPrismaError(error) && error.code === 'P2003';
}

/**
 * Type guard to check for record not found
 */
export function isPrismaNotFoundError(error: unknown): error is PrismaError {
  return isPrismaError(error) && error.code === 'P2025';
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  details?: string,
  additionalData?: Record<string, unknown>
): ApiErrorResponse {
  return {
    error,
    details,
    ...additionalData,
  };
}
