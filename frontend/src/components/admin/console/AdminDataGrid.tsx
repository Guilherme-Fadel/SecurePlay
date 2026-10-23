import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AdminDataGridColumn<Row> {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  className?: string;
  width?: string;
}

export interface AdminDataGridProps<Row> {
  columns: AdminDataGridColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string | number;
  toolbar?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  empty?: ReactNode;
  onRetry?: () => void;
  className?: string;
  selectedKey?: string | number | null;
  onSelectRow?: (row: Row) => void;
  onOpenRow?: (row: Row) => void;
}

/** Grid opt-in do console; telas mantêm controle de busca, ações e paginação. */
export function AdminDataGrid<Row>({ columns, rows, rowKey, toolbar, footer, loading = false, error, empty = 'Nenhum registro encontrado.', onRetry, className, selectedKey, onSelectRow, onOpenRow }: AdminDataGridProps<Row>) {
  return (
    <section className={cn('admin-data-grid', className)} aria-busy={loading}>
      <div className="admin-data-grid-toolbar">{toolbar}</div>
      <div className="admin-data-grid-body">
        {loading ? <div className="admin-data-grid-state" role="status">Carregando registros…</div>
          : error ? <div className="admin-data-grid-state is-error" role="alert"><span>{error}</span>{onRetry && <button type="button" onClick={onRetry}>Tentar novamente</button>}</div>
          : rows.length === 0 ? <div className="admin-data-grid-state">{empty}</div>
          : <div className="admin-data-grid-table-wrap"><table className="admin-data-grid-table" style={{ gridTemplateColumns: columns.map((column) => column.width ?? (column.className?.includes('admin-grid-icon-column') ? '64px' : column.key === 'level' ? '100px' : column.key === 'status' ? '140px' : 'minmax(0, 1fr)')).join(' ') }}>
            <thead><tr>{columns.map((column) => <th key={column.key} className={column.className} scope="col">{column.label}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={rowKey(row)} className={cn(onSelectRow && 'is-selectable', selectedKey === rowKey(row) && 'is-selected')} tabIndex={onSelectRow ? 0 : undefined} onClick={(event) => { if (!(event.target as HTMLElement).closest('button,a,input,select')) onSelectRow?.(row); }} onDoubleClick={(event) => { if (!(event.target as HTMLElement).closest('button,a,input,select')) onOpenRow?.(row); }} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter') { event.preventDefault(); onOpenRow?.(row); } else if (event.key === ' ') { event.preventDefault(); onSelectRow?.(row); } }}>{columns.map((column) => <td key={column.key} className={column.className} data-label={column.label}>{column.render(row)}</td>)}</tr>)}</tbody>
          </table></div>}
      </div>
      <footer className="admin-data-grid-footer">{footer}</footer>
    </section>
  );
}
