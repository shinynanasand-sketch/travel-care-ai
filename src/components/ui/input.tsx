import { cn } from '@/lib/utils/cn';
import type { InputHTMLAttributes } from 'react';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500',
        className
      )}
      {...props}
    />
  );
}
