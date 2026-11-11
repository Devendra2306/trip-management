import React from 'react';
import { getStatusColour, type PnrStatus } from '@yatra/shared';
import { cn } from '@/lib/utils';

interface PnrStatusBadgeProps {
  status: string;
  className?: string;
}

export function PnrStatusBadge({ status, className }: PnrStatusBadgeProps) {
  // Normalize string to PnrStatus
  const upper = status.toUpperCase();
  let code: PnrStatus = 'UNKNOWN';
  if (upper.includes('CNF') || upper.includes('CONFIRM')) code = 'CNF';
  else if (upper.includes('RAC')) code = 'RAC';
  else if (upper.includes('RLWL')) code = 'RLWL';
  else if (upper.includes('GNWL')) code = 'GNWL';
  else if (upper.includes('PQWL')) code = 'PQWL';
  else if (upper.includes('WL')) code = 'WL';
  else if (upper.includes('CAN')) code = 'CAN';
  else if (upper.includes('CHART')) code = 'CHART_PREPARED';

  const config = getStatusColour(code);

  return (
    <span
      style={{ backgroundColor: config.bg, color: config.fg }}
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider shadow-sm',
        className
      )}
    >
      {status || config.label}
    </span>
  );
}
