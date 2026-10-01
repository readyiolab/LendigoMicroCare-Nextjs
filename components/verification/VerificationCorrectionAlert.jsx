import React from 'react';
import { AlertCircle, RotateCcw, AlertTriangle, Info, Clock, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/**
 * Enterprise-grade component to display verification errors, retry counts, and correction instructions.
 */
export default function VerificationCorrectionAlert({
  status, // 'RETRY_ALLOWED', 'BLOCKED', 'ACTION_REQUIRED', 'FAILED'
  reasonCode,
  customerMessage,
  retryCount = 0,
  maxRetry = 3,
  onRetry,
  isLoading = false,
  customActionLabel = 'Retry Verification'
}) {
  if (!status || !['RETRY_ALLOWED', 'BLOCKED', 'ACTION_REQUIRED', 'FAILED'].includes(status)) {
    return null;
  }

  const isBlocked = status === 'BLOCKED' || retryCount >= maxRetry;
  const retriesLeft = Math.max(0, maxRetry - retryCount);

  // Variant styling based on status
  let alertVariant = 'destructive';
  let Icon = AlertCircle;
  let title = 'Verification Failed';

  if (isBlocked) {
    alertVariant = 'destructive';
    Icon = XCircle;
    title = 'Verification Blocked';
  } else if (status === 'ACTION_REQUIRED' || status === 'RETRY_ALLOWED') {
    alertVariant = 'warning';
    Icon = AlertTriangle;
    title = 'Action Required';
  }

  // Common UI styles
  const variantStyles = {
    destructive: 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400',
    warning: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    info: 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };

  return (
    <Alert className={`mb-6 flex flex-col gap-3 ${variantStyles[alertVariant] || variantStyles.destructive}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1">
          <AlertTitle className="text-base font-semibold mb-1">{title}</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            {customerMessage || 'We encountered an issue verifying your details. Please check and try again.'}
            {reasonCode && (
              <span className="block mt-1 text-xs opacity-70 font-mono">
                Error Code: {reasonCode}
              </span>
            )}
          </AlertDescription>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 pt-3 border-t border-current/10">
        <div className="flex items-center gap-2 text-xs font-medium">
          {isBlocked ? (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Maximum retries exceeded. Support team has been notified.
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Info className="w-4 h-4" />
              Retries remaining: {retriesLeft} of {maxRetry}
            </span>
          )}
        </div>

        {!isBlocked && onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            disabled={isLoading}
            variant="outline"
            className="w-full sm:w-auto bg-transparent border-current hover:bg-current/10 text-current"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                {customActionLabel}
              </span>
            )}
          </Button>
        )}
      </div>
    </Alert>
  );
}
