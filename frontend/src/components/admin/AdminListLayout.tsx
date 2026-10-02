import type { FormEventHandler, ReactNode } from 'react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AdminHelpTip } from '@/components/admin/AdminHelpTip';
import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  count?: number;
  countLabel?: string;
  countIcon?: ReactNode;
  action?: ReactNode;
}

export function AdminPageHeader({ title, description, count, countLabel, countIcon, action }: AdminPageHeaderProps) {
  return (
    <header className="admin-list-header">
      <div className="admin-heading-title">
        <h1>{title}</h1>
        <AdminHelpTip label={title} text={description} />
      </div>
      {count !== undefined && countLabel && (
        <div className="admin-list-count" role="status" aria-label={`${count} ${countLabel}`}>
          {countIcon && <span className="admin-list-count-icon" aria-hidden="true">{countIcon}</span>}
          <strong>{count}</strong>
          <span>{countLabel}</span>
        </div>
      )}
      {action}
    </header>
  );
}

interface AdminCardHeadingProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconTone?: 'accent' | 'secondary';
}

export function AdminCardHeading({ title, description, icon, iconTone }: AdminCardHeadingProps) {
  return (
    <div className="admin-users-card-heading">
      <span className={cn('admin-users-heading-icon', iconTone && `is-${iconTone}`)} aria-hidden="true">{icon}</span>
      <div className="admin-heading-title">
        <h2>{title}</h2>
        <AdminHelpTip label={title} text={description} />
      </div>
    </div>
  );
}

interface AdminListToolbarProps {
  children: ReactNode;
  className?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}

export function AdminListToolbar({ children, className, onSubmit }: AdminListToolbarProps) {
  const classes = cn('admin-list-toolbar', className);
  return onSubmit
    ? <form className={classes} onSubmit={onSubmit}>{children}</form>
    : <div className={classes}>{children}</div>;
}

interface AdminListCardProps {
  children: ReactNode;
  className?: string;
  loading?: boolean;
}

export function AdminListCard({ children, className, loading = false }: AdminListCardProps) {
  return <section className={cn('admin-list-card', className)} aria-busy={loading}>{children}</section>;
}

export function AdminListContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('admin-list-content', className)}>{children}</div>;
}

interface AdminListStateProps {
  kind: 'loading' | 'empty' | 'error';
  children: ReactNode;
  onRetry?: () => void;
}

export function AdminListState({ kind, children, onRetry }: AdminListStateProps) {
  return (
    <div className={cn('admin-list-state', `is-${kind}`)} role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined}>
      <span>{children}</span>
      {kind === 'error' && onRetry && <AppButton variant="ghost" size="sm" onClick={onRetry}>Tentar novamente</AppButton>}
    </div>
  );
}

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  ariaLabel: string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  detail?: string;
}

export function AdminPagination({ page, totalPages, ariaLabel, onPageChange, disabled = false, detail }: AdminPaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav className="admin-list-pagination" aria-label={ariaLabel}>
      <AppButton variant="ghost" size="sm" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</AppButton>
      <span>Página {page} de {Math.max(1, totalPages)}{detail ? ` · ${detail}` : ''}</span>
      <AppButton variant="ghost" size="sm" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>Próxima</AppButton>
    </nav>
  );
}
