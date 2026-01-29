/**
 * Frontend Error Reporting Module
 * 
 * Captures and reports frontend errors to the backend for centralized logging.
 * Uses fire-and-forget pattern to avoid impacting user experience.
 */

import { supabase } from '@/integrations/supabase/client';

interface FrontendError {
  message: string;
  stack?: string;
  componentName?: string;
  severity?: 'warning' | 'error' | 'critical';
  metadata?: Record<string, unknown>;
}

/**
 * Report a frontend error to the backend
 * Non-blocking: errors in reporting are silently logged to console
 */
export async function reportFrontendError(error: FrontendError): Promise<void> {
  try {
    // Get current user if available
    const { data: { session } } = await supabase.auth.getSession();
    
    // Convert metadata to JSON-safe format
    const requestParams = error.metadata 
      ? JSON.parse(JSON.stringify(error.metadata))
      : null;
    
    await supabase.from('error_logs').insert([{
      error_type: 'frontend' as const,
      error_message: error.message,
      stack_trace: error.stack || null,
      function_name: error.componentName || null,
      user_id: session?.user?.id || null,
      request_path: window.location.pathname,
      severity: error.severity || 'error',
      request_params: requestParams,
    }]);
  } catch (e) {
    // Silent fail - never break the app due to error reporting
    console.error('[ErrorReporter] Failed to report error:', e);
  }
}

/**
 * Initialize global error handlers
 * Should be called once at app startup
 */
export function initializeErrorReporting(): void {
  // Global unhandled error handler
  window.addEventListener('error', (event) => {
    reportFrontendError({
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
      severity: 'error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught_error',
      },
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    reportFrontendError({
      message: event.reason?.message || 'Unhandled promise rejection',
      stack: event.reason?.stack,
      severity: 'error',
      metadata: {
        type: 'unhandled_rejection',
        reason: String(event.reason),
      },
    });
  });

  console.log('[ErrorReporter] Initialized global error handlers');
}

/**
 * Create an error boundary reporter function
 * For use in React error boundaries
 */
export function createErrorBoundaryReporter(componentName: string) {
  return (error: Error, errorInfo: { componentStack?: string }) => {
    reportFrontendError({
      message: error.message,
      stack: error.stack,
      componentName,
      severity: 'error',
      metadata: {
        type: 'react_error_boundary',
        componentStack: errorInfo.componentStack,
      },
    });
  };
}
