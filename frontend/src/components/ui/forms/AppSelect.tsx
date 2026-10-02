import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function AppSelect({ className, children, ...props }: ComponentProps<'select'>) {
  return <select className={cn('app-filter-select', className)} {...props}>{children}</select>;
}
