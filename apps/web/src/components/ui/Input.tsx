import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-slate uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border border-ash bg-white px-3 py-2 text-sm text-coal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-saffron focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rust focus:ring-rust',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rust mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
