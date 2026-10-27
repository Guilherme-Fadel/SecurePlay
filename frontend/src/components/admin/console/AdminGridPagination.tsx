import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AdminPagination } from '../AdminListLayout';

export function AdminGridPagination({ page, pageSize, total, totalPages, loading, onPageChange, onPageSizeChange, ariaLabel = 'Paginação de registros' }: { page: number; pageSize?: number; total: number; totalPages: number; loading?: boolean; onPageChange: (page: number) => void; onPageSizeChange?: (size: number) => void; ariaLabel?: string }) {
  return <div className="admin-grid-pagination-layout">
    <AdminPagination alwaysVisible page={page} totalPages={totalPages} ariaLabel={ariaLabel} onPageChange={onPageChange} disabled={loading} />
    <div className="admin-grid-pagination-summary">
      <span role="status">{total} {total === 1 ? 'registro' : 'registros'}</span>
      {pageSize !== undefined && onPageSizeChange && <AppSelect aria-label="Registros por página" title="Registros por página" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></AppSelect>}
    </div>
  </div>;
}
