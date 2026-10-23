import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export function AdminFeedback({ children, variant = 'success' }: { children: ReactNode; variant?: 'success' | 'error' | 'info' }) {
  const Icon = variant === 'error' ? AlertCircle : variant === 'info' ? Info : CheckCircle2;
  return <div className={`admin-feedback${variant === 'error' ? ' is-error' : ''}`} role={variant === 'error' ? 'alert' : 'status'}><Icon size={17} aria-hidden="true" />{children}</div>;
}
