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

export function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <header className="admin-list-header">
      <div className="admin-heading-title">
        <h1>{title}</h1>
        <AdminHelpTip label={title} text={description} />
      </div>
      {action && <div className="admin-page-header-end">
      <div className="admin-page-header-actions">{action}</div>
      </div>}
    </header>
  );
}

interface AdminCardHeadingProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconTone?: 'accent' | 'secondary';
  action?: ReactNode;
}

export function AdminCardHeading({ title, description, icon, iconTone, action }: AdminCardHeadingProps) {
  return (
    <div className="admin-users-card-heading">
      <span className={cn('admin-users-heading-icon', iconTone && `is-${iconTone}`)} aria-hidden="true">{icon}</span>
      <div className="admin-heading-title">
        <h2>{title}</h2>
        <AdminHelpTip label={title} text={description} />
      </div>
      {action}
    </div>
  );
}

interface AdminListToolbarProps {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}

export function AdminListToolbar({ children, actions, className, onSubmit }: AdminListToolbarProps) {
  const classes = cn('admin-list-toolbar', className);
  const content = <>{children}{actions && <div className="admin-list-toolbar-actions">{actions}</div>}</>;
  return onSubmit
    ? <form className={classes} onSubmit={onSubmit}>{content}</form>
    : <div className={classes}>{content}</div>;
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
  adjacentButtons?: boolean;
  alwaysVisible?: boolean;
}

export function AdminPagination({ page, totalPages, ariaLabel, onPageChange, disabled = false, detail, adjacentButtons = false, alwaysVisible = false }: AdminPaginationProps) {
  if (totalPages <= 1 && !alwaysVisible) return null;
  return (
    <nav className={cn('admin-list-pagination', adjacentButtons && 'admin-pagination-adjacent')} aria-label={ariaLabel}>
      <AppButton variant="ghost" size="sm" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</AppButton>
      <span>Página {page} de {Math.max(1, totalPages)}{detail ? ` · ${detail}` : ''}</span>
      <AppButton variant="ghost" size="sm" disabled={disabled || page >= Math.max(1, totalPages)} onClick={() => onPageChange(page + 1)}>Próxima</AppButton>
    </nav>
  );
}
