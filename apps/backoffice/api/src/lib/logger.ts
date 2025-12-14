/**
 * Production-safe logging utilities
 * Respects NODE_ENV and LOG_LEVEL settings
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug');

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[LOG_LEVEL as LogLevel];
}

/**
 * Debug logs - only in development or when LOG_LEVEL=debug
 */
export function debug(...args: unknown[]): void {
  if (shouldLog('debug')) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Info logs - for general information
 */
export function info(...args: unknown[]): void {
  if (shouldLog('info')) {
    console.log('[INFO]', ...args);
  }
}

/**
 * Warning logs
 */
export function warn(...args: unknown[]): void {
  if (shouldLog('warn')) {
    console.warn('[WARN]', ...args);
  }
}

/**
 * Error logs - always logged
 */
export function error(...args: unknown[]): void {
  if (shouldLog('error')) {
    console.error('[ERROR]', ...args);
  }
}

/**
 * Performance timing utility
 */
export function logTiming(label: string, startTime: number): void {
  const duration = Date.now() - startTime;
  if (shouldLog('info')) {
    console.log(`[TIMING] ${label}: ${duration}ms`);
  }
}
