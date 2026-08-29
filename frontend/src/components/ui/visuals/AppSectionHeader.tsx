import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppSectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function AppSectionHeader({ title, subtitle, action, className }: AppSectionHeaderProps) {
  return (
    <div className={cn('app-section-header', className)}>
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
