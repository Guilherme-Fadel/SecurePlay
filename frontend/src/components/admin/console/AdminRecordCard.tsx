import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AdminRecordCard({ children, busy = false, className }: { children: ReactNode; busy?: boolean; className?: string }) {
  return <section className={cn('admin-record-card', className)} aria-busy={busy}>{children}</section>;
}
