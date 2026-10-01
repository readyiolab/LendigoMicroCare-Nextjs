import React from 'react';
import { cn } from '@/lib/utils';

const COLOR_MAP = {
  default: 'bg-slate-900',
  blue: 'bg-blue-600',
  emerald: 'bg-emerald-600',
  amber: 'bg-amber-500',
  red: 'bg-red-600',
};

/**
 * Simple on/off toggle — no checkbox ticks.
 */
export default function AccessToggle({
  checked = false,
  onCheckedChange,
  disabled = false,
  color = 'default',
  'aria-label': ariaLabel,
  className,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1',
        checked ? COLOR_MAP[color] || COLOR_MAP.default : 'bg-slate-200',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
