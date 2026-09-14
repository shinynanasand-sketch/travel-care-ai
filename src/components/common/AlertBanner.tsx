'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface AlertBannerProps {
  level: 'INFO' | 'WARNING' | 'EMERGENCY';
  message: string;
  action?: string;
  onAction?: () => void;
  secondaryAction?: string;
  onSecondaryAction?: () => void;
}

const styles = {
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
  WARNING: 'bg-yellow-50 border-yellow-300 text-yellow-900',
  EMERGENCY: 'bg-red-50 border-red-400 text-red-900',
};

export function AlertBanner({
  level,
  message,
  action,
  onAction,
  secondaryAction,
  onSecondaryAction,
}: AlertBannerProps) {
  const hasActions =
    (action && onAction) || (secondaryAction && onSecondaryAction);

  return (
    <div className={cn('rounded-lg border p-4', styles[level])}>
      <p className="text-base font-semibold">
        {level === 'EMERGENCY' ? '🚨 ' : level === 'WARNING' ? '⚠️ ' : 'ℹ️ '}
        {message}
      </p>
      {hasActions && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {action && onAction && (
            <Button
              variant={level === 'EMERGENCY' ? 'danger' : 'default'}
              size="sm"
              onClick={onAction}
            >
              {action}
            </Button>
          )}
          {secondaryAction && onSecondaryAction && (
            <Button
              variant="outline"
              size="sm"
              className="border-current bg-white/80 hover:bg-white"
              onClick={onSecondaryAction}
            >
              {secondaryAction}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
