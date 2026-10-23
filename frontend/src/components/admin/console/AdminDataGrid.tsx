import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AdminDataGridColumn<Row> {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  className?: string;
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
}

/** Grid opt-in do console; telas mantêm controle de busca, ações e paginação. */
export function AdminDataGrid<Row>({ columns, rows, rowKey, toolbar, footer, loading = false, error, empty = 'Nenhum registro encontrado.', onRetry, className }: AdminDataGridProps<Row>) {
  return (
    <section className={cn('admin-data-grid', className)} aria-busy={loading}>
      <div className="admin-data-grid-toolbar">{toolbar}</div>
      <div className="admin-data-grid-body">
        {loading ? <div className="admin-data-grid-state" role="status">Carregando registros…</div>
          : error ? <div className="admin-data-grid-state is-error" role="alert"><span>{error}</span>{onRetry && <button type="button" onClick={onRetry}>Tentar novamente</button>}</div>
          : rows.length === 0 ? <div className="admin-data-grid-state">{empty}</div>
          : <div className="admin-data-grid-table-wrap"><table className="admin-data-grid-table">
            <thead><tr>{columns.map((column) => <th key={column.key} className={column.className} scope="col">{column.label}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} className={column.className} data-label={column.label}>{column.render(row)}</td>)}</tr>)}</tbody>
          </table></div>}
      </div>
      <footer className="admin-data-grid-footer">{footer}</footer>
    </section>
  );
}
