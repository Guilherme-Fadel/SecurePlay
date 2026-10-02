import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface AppFilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

export function AppFilterChip({ selected, className, children, type = 'button', ...props }: AppFilterChipProps) {
  return (
    <button {...props} type={type} className={cn('app-filter-chip', selected && 'is-active', className)} aria-pressed={selected}>
      {children}
    </button>
  );
}
