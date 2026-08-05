'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface AlertBannerProps {
  level: 'INFO' | 'WARNING' | 'EMERGENCY';
  message: string;
  action?: string;
  onAction?: () => void;
}

const styles = {
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
  WARNING: 'bg-yellow-50 border-yellow-300 text-yellow-900',
  EMERGENCY: 'bg-red-50 border-red-400 text-red-900',
};

export function AlertBanner({ level, message, action, onAction }: AlertBannerProps) {
  return (
    <div className={cn('rounded-lg border p-4', styles[level])}>
      <p className="text-base font-semibold">
        {level === 'EMERGENCY' ? '🚨 ' : level === 'WARNING' ? '⚠️ ' : 'ℹ️ '}
        {message}
      </p>
      {action && onAction && (
        <Button
          variant={level === 'EMERGENCY' ? 'danger' : 'default'}
          size="sm"
          className="mt-3"
          onClick={onAction}
        >
          {action}
        </Button>
      )}
    </div>
  );
}
