import { useAdminListFilters } from '@/hooks/useAdminListFilters';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { AdminDataGrid, type AdminDataGridColumn } from './AdminDataGrid';
import { AdminGridPagination } from './AdminGridPagination';
import { AdminListToolbar, AdminPageHeader } from '../AdminListLayout';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { adminQueryKey } from '@/lib/adminCache';
import { listarEmpresasPaginadas, type EmpresaAdministravel } from '@/services/admin';

export function CompanyRegistryTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const storageKey = `company-registry:${user?.userId}`;
  const { filters, setFilters, search, setSearch, normalizePage } = useAdminListFilters(storageKey, 'asc');
  const [selectedId, setSelectedId] = useState<number | null>(location.state?.selectedId ?? null);
  const query = useCachedQuery(adminQueryKey('companies-page', undefined, filters), () => listarEmpresasPaginadas({ ...filters, sort: filters.sort === 'desc' ? 'desc' : 'asc' }));
  useEffect(() => { if (query.data) normalizePage(query.data.totalPages); }, [query.data, filters.page]);
  const open = (company: EmpresaAdministravel) => navigate(`/admin/empresas/${company.id}/editar`, { state: { returnTo: '/admin/empresas', selectedId: company.id } });
  const columns: AdminDataGridColumn<EmpresaAdministravel>[] = [
    { key: 'edit', label: 'Editar', className: 'admin-grid-icon-column', render: (company) => <button type="button" className="admin-grid-icon-action" aria-label={`Editar ${company.nome}`} title={`Editar ${company.nome}`} onClick={() => open(company)}><Pencil size={16} /></button> },
    { key: 'company', label: 'Empresa', render: (company) => <strong>{company.nome}</strong> },
    { key: 'id', label: 'Código', width: '100px', render: (company) => company.id },
  ];
  return <div className="admin-users-content">
    <AdminPageHeader title="Cadastro" description="Pesquise as empresas e abra o cadastro para consultar ou editar seus dados." />
    <AdminDataGrid columns={columns} rows={query.data?.items ?? []} rowKey={(company) => company.id} selectedKey={selectedId} onSelectRow={(company) => setSelectedId(company.id)} onOpenRow={open} loading={query.loading} error={query.error ? 'Não foi possível carregar as empresas.' : undefined} onRetry={query.refetch}
      toolbar={<AdminListToolbar actions={<Link className="admin-console-primary-link" to="/admin/empresas/nova"><Plus size={16} /> Novo</Link>}><AppSearchInput label="Buscar empresas" placeholder="Buscar empresa pelo nome" value={search} onChange={(event) => setSearch(event.target.value)} /><AppSelect aria-label="Ordenar empresas" value={filters.sort} onChange={(event) => setFilters((previous) => ({ ...previous, sort: event.target.value === 'desc' ? 'desc' : 'asc', page: 1 }))}><option value="asc">Nome A–Z</option><option value="desc">Nome Z–A</option></AppSelect></AdminListToolbar>}
      footer={<AdminGridPagination page={filters.page} pageSize={filters.pageSize} total={query.data?.total ?? 0} totalPages={query.data?.totalPages ?? 0} loading={query.loading} onPageChange={(page) => setFilters((previous) => ({ ...previous, page }))} onPageSizeChange={(pageSize) => setFilters((previous) => ({ ...previous, pageSize, page: 1 }))} />}
    />
  </div>;
}
