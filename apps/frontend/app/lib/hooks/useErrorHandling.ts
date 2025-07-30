import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export interface ErrorDetails {
  id: string;
  message: string;
  type: 'network' | 'validation' | 'server' | 'timeout' | 'unknown';
  timestamp: Date;
  context?: Record<string, any>;
  recoverable?: boolean;
  retryCount?: number;
  source?: string;
}

export interface ErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToasts?: boolean;
  logErrors?: boolean;
  autoRetry?: boolean;
}

export interface ErrorHandlingReturn {
  errors: ErrorDetails[];
  hasErrors: boolean;
  isRetrying: boolean;
  addError: (error: Partial<ErrorDetails>) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  retryError: (errorId: string) => Promise<void>;
  handleAsyncError: <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ) => Promise<T | null>;
}

export function useErrorHandling(
  options: ErrorHandlingOptions = {}
): ErrorHandlingReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToasts = true,
    logErrors = true,
    autoRetry = false
  } = options;

  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Classify error type
  const classifyError = useCallback((error: any): ErrorDetails['type'] => {
    if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') {
      return 'network';
    }
    if (error?.status >= 400 && error?.status < 500) {
      return 'validation';
    }
    if (error?.status >= 500) {
      return 'server';
    }
    if (error?.name === 'TimeoutError' || error?.code === 'TIMEOUT') {
      return 'timeout';
    }
    return 'unknown';
  }, []);

  // Generate user-friendly error message
  const generateFriendlyMessage = useCallback((error: any, type: ErrorDetails['type']): string => {
    switch (type) {
      case 'network':
        return 'Network connection failed.';
      case 'validation':
        return error?.message || 'Invalid data provided. Please check your input.';
      case 'server':
        return 'Server error occurred. Please try again later.';
      case 'timeout':
        return 'Request timed out. Please try again.';
      default:
        return error?.message || 'An unexpected error occurred.';
    }
  }, []);

  // Add error to the list
  const addError = useCallback((errorInput: Partial<ErrorDetails>) => {
    const errorId = errorInput.id || `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const errorType = errorInput.type || classifyError(errorInput);
    const message = errorInput.message || generateFriendlyMessage(errorInput, errorType);
    
    const newError: ErrorDetails = {
      id: errorId,
      message,
      type: errorType,
      timestamp: new Date(),
      context: errorInput.context,
      recoverable: errorInput.recoverable ?? ['network', 'timeout', 'server'].includes(errorType),
      retryCount: errorInput.retryCount || 0,
      source: errorInput.source || 'unknown'
    };

    setErrors(prev => [...prev, newError]);

    if (logErrors) {
      console.error('Error logged:', newError);
    }

    if (showToasts) {
      const toastOptions = {
        duration: errorType === 'validation' ? 5000 : 8000,
        position: 'top-right' as const,
        style: {
          background: '#ef4444',
          color: '#ffffff',
        },
      };

      if (newError.recoverable) {
        toast.error(
          `${message} ${(newError.retryCount ?? 0) < maxRetries ? '(Click to retry)' : ''}`,
          toastOptions
        );
      } else {
        toast.error(message, toastOptions);
      }
    }

    // Auto-retry if enabled and error is recoverable
    if (autoRetry && newError.recoverable && (newError.retryCount ?? 0) < maxRetries) {
      const timer = setTimeout(() => {
        retryError(errorId);
      }, retryDelay * Math.pow(2, newError.retryCount ?? 0)); // Exponential backoff

      retryTimersRef.current.set(errorId, timer);
    }

    return errorId;
  }, [
    classifyError,
    generateFriendlyMessage,
    logErrors,
    showToasts,
    autoRetry,
    maxRetries,
    retryDelay
  ]);

  // Remove error from the list
  const removeError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
    
    // Clear any pending retry timer
    const timer = retryTimersRef.current.get(errorId);
    if (timer) {
      clearTimeout(timer);
      retryTimersRef.current.delete(errorId);
    }

    // Dismiss toast
    if (showToasts) {
      toast.dismiss(errorId);
    }
  }, [showToasts]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    // Clear all timers
    retryTimersRef.current.forEach(timer => clearTimeout(timer));
    retryTimersRef.current.clear();

    setErrors([]);

    if (showToasts) {
      toast.dismiss();
    }
  }, [showToasts]);

  // Retry a specific error
  const retryError = useCallback(async (errorId: string) => {
    const error = errors.find(e => e.id === errorId);
    if (!error || !error.recoverable || (error.retryCount ?? 0) >= maxRetries) {
      return;
    }

    setIsRetrying(true);

    try {
      // Update retry count
      setErrors(prev => prev.map(e => 
        e.id === errorId 
          ? { ...e, retryCount: (e.retryCount || 0) + 1 }
          : e
      ));

      // For demonstration, we'll just remove the error after a delay
      // In a real implementation, you'd re-execute the failed operation
      await new Promise(resolve => setTimeout(resolve, 1000));

      removeError(errorId);

      if (showToasts) {
        toast.success('✅ Operation retried successfully', {
          duration: 3000,
          position: 'top-right',
        });
      }

    } catch (retryError) {
      console.error('Retry failed:', retryError);
      
      if (showToasts) {
        toast.error('Retry failed. Please try again manually.', {
          duration: 5000,
          position: 'top-right',
        });
      }
    } finally {
      setIsRetrying(false);
    }
  }, [errors, maxRetries, removeError, showToasts]);

  // Handle async operations with automatic error handling
  const handleAsyncError = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      const errorId = addError({
        message: error instanceof Error ? error.message : String(error),
        context: {
          ...context,
          originalError: error
        },
        source: context?.source || 'async-operation'
      });

      return null;
    }
  }, [addError]);

  return {
    errors,
    hasErrors: errors.length > 0,
    isRetrying,
    addError,
    removeError,
    clearErrors,
    retryError,
    handleAsyncError
  };
}