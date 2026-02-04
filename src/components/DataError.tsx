import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppError, ErrorType } from '@/lib/error-handling';

export type DataErrorVariant = 'inline' | 'card' | 'full-page';

interface DataErrorProps {
  error: AppError | Error | null;
  onRetry?: () => void;
  variant?: DataErrorVariant;
  className?: string;
}

/**
 * Reusable component for displaying fetch/data errors
 * Supports different variants for different contexts
 */
export function DataError({
  error,
  onRetry,
  variant = 'card',
  className = ''
}: DataErrorProps) {
  if (!error) return null;

  // Normalize to AppError if needed
  const appError = error instanceof AppError ? error : new AppError(
    ErrorType.UNKNOWN,
    error.message || 'An error occurred'
  );

  // Select icon based on error type
  const ErrorIcon = appError.type === ErrorType.NETWORK ? WifiOff : AlertCircle;

  // Get user-friendly message
  const message = appError.message || 'Failed to load data';

  // Inline variant - minimal, for use within other components
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm text-destructive ${className}`}>
        <ErrorIcon className="h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
        {onRetry && appError.recoverable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-auto py-1 px-2 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  // Card variant - contained error display
  if (variant === 'card') {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="rounded-full bg-destructive/10 p-2">
            <ErrorIcon className="h-5 w-5 text-destructive" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Failed to load data</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>

          {onRetry && appError.recoverable && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Full-page variant - for page-level errors
  return (
    <div className={`flex items-center justify-center min-h-[400px] p-4 ${className}`}>
      <Card className="max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <ErrorIcon className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Unable to load data</h2>
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
          </div>

          {onRetry && appError.recoverable && (
            <Button
              onClick={onRetry}
              className="w-full gap-2"
              variant="default"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
