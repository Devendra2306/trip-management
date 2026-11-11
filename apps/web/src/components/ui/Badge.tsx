import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brass';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-ash text-slate',
    success: 'bg-green-100 text-forest border border-green-300',
    warning: 'bg-amber-100 text-amber-800 border border-amber-300',
    danger: 'bg-red-100 text-rust border border-red-300',
    info: 'bg-blue-100 text-blue-800 border border-blue-300',
    brass: 'bg-[#F9F5EB] text-brass border border-brass/40',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
