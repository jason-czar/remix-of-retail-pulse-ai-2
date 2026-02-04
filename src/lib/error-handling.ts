import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Error types for categorizing application errors
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Custom application error class with additional context
 */
export class AppError extends Error {
  type: ErrorType;
  recoverable: boolean;
  originalError?: Error;

  constructor(
    type: ErrorType,
    message: string,
    recoverable: boolean = true,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.recoverable = recoverable;
    this.originalError = originalError;

    // Maintains proper stack trace for where error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Normalizes different error types into AppError
 */
export function handleApiError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new AppError(
      ErrorType.NETWORK,
      'Unable to connect to the server. Please check your internet connection.',
      true,
      error
    );
  }

  // Handle HTTP response errors
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Auth errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      return new AppError(
        ErrorType.AUTH,
        'Authentication failed. Please log in again.',
        true,
        error
      );
    }

    // Not found errors
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return new AppError(
        ErrorType.NOT_FOUND,
        'The requested resource was not found.',
        true,
        error
      );
    }

    // Rate limit errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return new AppError(
        ErrorType.RATE_LIMIT,
        'Too many requests. Please try again later.',
        true,
        error
      );
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return new AppError(
        ErrorType.VALIDATION,
        error.message,
        true,
        error
      );
    }

    // Generic error with message
    return new AppError(
      ErrorType.UNKNOWN,
      error.message || 'An unexpected error occurred.',
      true,
      error
    );
  }

  // Unknown error type
  return new AppError(
    ErrorType.UNKNOWN,
    'An unexpected error occurred.',
    true
  );
}

/**
 * User-friendly error messages for different error types
 */
function getErrorMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return error.message;
    case ErrorType.AUTH:
      return error.message;
    case ErrorType.NOT_FOUND:
      return error.message;
    case ErrorType.RATE_LIMIT:
      return error.message;
    case ErrorType.VALIDATION:
      return error.message;
    case ErrorType.UNKNOWN:
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}

/**
 * Hook that displays error toast messages
 * @param error The error to display (null if no error)
 * @param options Toast options
 */
export function useErrorToast(
  error: AppError | null,
  options: {
    autoHide?: boolean;
    duration?: number;
    onRetry?: () => void;
  } = {}
) {
  const { autoHide = true, duration = 5000, onRetry } = options;

  useEffect(() => {
    if (!error) return;

    const message = getErrorMessage(error);

    // Log error to console for debugging (would be Sentry in production)
    console.error('Application Error:', {
      type: error.type,
      message: error.message,
      recoverable: error.recoverable,
      originalError: error.originalError
    });

    // Show toast notification
    if (error.recoverable && onRetry) {
      toast.error(message, {
        duration: autoHide ? duration : Infinity,
        action: {
          label: 'Retry',
          onClick: onRetry
        }
      });
    } else {
      toast.error(message, {
        duration: autoHide ? duration : Infinity
      });
    }
  }, [error, autoHide, duration, onRetry]);
}
