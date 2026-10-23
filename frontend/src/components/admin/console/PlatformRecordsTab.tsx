import { AdminFeedback } from './AdminFeedback';
import { useAdminListFilters } from '@/hooks/useAdminListFilters';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { AdminDataGrid, type AdminDataGridColumn } from './AdminDataGrid';
import { AdminListToolbar, AdminPageHeader } from '../AdminListLayout';
import { AdminGridPagination } from './AdminGridPagination';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listPlatformRecords, type PlatformRecord, type PlatformResource } from '@/services/platformRecords';
import { aprovarApelido, rejeitarApelido, revogarConvite } from '@/services/convites';

const titles: Record<PlatformResource, string> = { users: 'Usuários', nicknames: 'Apelidos pendentes', invitations: 'Convites', 'audit-settings': 'Auditoria · Configurações', 'audit-events': 'Eventos administrativos', pilots: 'Pilotos escolares' };
const statusLabels: Record<string, string> = { active: 'Ativo', inactive: 'Inativo', revoked: 'Revogado', expired: 'Expirado', used: 'Utilizado', planned: 'Planejado', paused: 'Pausado', completed: 'Concluído', converted: 'Convertido', cancelled: 'Cancelado' };

export function PlatformRecordsTab({ resource, empresaId, companyFilter }: { resource: PlatformResource; empresaId?: number; companyFilter: ReactNode }) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const storageKey = `platform-list:${user?.userId}:${resource}:${empresaId ?? 'all'}`;
  const { filters: state, setFilters: setState, search, setSearch, normalizePage } = useAdminListFilters(storageKey);
  const [selectedId, setSelectedId] = useState<number | null>(location.state?.selectedId ?? null);
  const [busy, setBusy] = useState<number | null>(null);
  const [messageError, setMessageError] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const query = useCachedQuery(`admin:platform:records:${resource}:${JSON.stringify({ ...state, empresaId })}`, () => listPlatformRecords(resource, { ...state, empresaId }));
  useEffect(() => { if (query.data) normalizePage(query.data.totalPages); }, [query.data, state.page]);
  const open = (row: PlatformRecord) => {
    if (!row.empresaId && !(resource === 'users' && row.id === user?.userId)) return;
    const path = resource === 'users' ? `pessoas/usuarios/${row.id}/editar` : resource === 'pilots' ? `operacao/pilotos/${row.id}/editar` : null;
    if (path) navigate(row.empresaId ? `/admin/empresas/${row.empresaId}/${path}` : `/admin/${path}`, { state: { returnTo: location.pathname + location.search, selectedId: row.id } });
  };
  const review = async (row: PlatformRecord, action: 'approve' | 'reject' | 'revoke') => {
    if (!row.empresaId) return;
    if (action === 'revoke' && !window.confirm('Revogar este convite? Ele deixará de permitir novos cadastros.')) return;
    setBusy(row.id); setMessage(null); setMessageError(false);
    try {
      if (action === 'approve') await aprovarApelido(row.id, row.empresaId);
      else if (action === 'reject') await rejeitarApelido(row.id, row.empresaId);
      else await revogarConvite(row.id, row.empresaId);
      setMessage('Alteração concluída.'); query.refetch();
    } catch { setMessageError(true); setMessage('Não foi possível concluir a alteração.'); }
    finally { setBusy(null); }
  };
  const iconAction = (label: string, row: PlatformRecord, icon: ReactNode, action: () => void) => <button type="button" className="admin-grid-icon-action" aria-label={`${label} ${row.title ?? `registro ${row.id}`}`} title={label} disabled={busy !== null || (!row.empresaId && !(resource === 'users' && row.id === user?.userId))} onClick={action}>{icon}</button>;
  const columns: AdminDataGridColumn<PlatformRecord>[] = [];
  if (resource === 'users' || resource === 'pilots') columns.push({ key: 'edit', label: 'Editar', className: 'admin-grid-icon-column', render: (row) => iconAction('Editar', row, <Pencil size={16} />, () => open(row)) });
  columns.push({
    key: 'title',
    label: resource === 'users' ? 'Usuário' : resource === 'nicknames' ? 'Apelido solicitado' : resource === 'invitations' ? 'Destinatário' : resource === 'pilots' ? 'Objetivo' : 'Responsável',
    render: (row) => {
      const useNickname = resource === 'users' && row.role === 'user' && Boolean(row.nickname);
      const title = useNickname ? row.nickname : row.title;
      const subtitle = useNickname ? `${row.title} · ${row.subtitle ?? 'Acesso por código da escola'}` : row.subtitle;
      return <><strong>{title ?? (resource === 'invitations' ? row.registrationMode === 'school_student' ? 'Convite escolar individual' : 'Link aberto para a empresa' : 'Indisponível')}{row.role === 'admin' ? ' · Administrador' : ''}</strong>
        {subtitle && <small>{subtitle}</small>}
        {resource === 'nicknames' && <small>{row.detail}</small>}
        {resource === 'invitations' && row.expiresAt && <small>Expira em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(row.expiresAt))} · {row.uses}/{row.maxUses} usos</small>}
      </>;
    },
  });
  columns.push({ key: 'company', label: 'Empresa', render: (row) => row.empresaNome ?? 'Gestão da plataforma' });
  if (resource === 'users') columns.push({ key: 'level', label: 'Nível', render: (row) => row.level });
  if (['users', 'invitations', 'pilots'].includes(resource)) columns.push({ key: 'status', label: 'Status', render: (row) => <span className={`admin-user-status ${row.status === 'active' ? 'is-active' : 'is-inactive'}`}>{statusLabels[row.status ?? ''] ?? row.status}</span> });
  if (resource.startsWith('audit')) {
    columns.push({ key: 'date', label: 'Data', render: (row) => row.createdAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.createdAt)) : '—' });
    columns.push({ key: 'detail', label: resource === 'audit-events' ? 'Evento' : 'Alteração', render: (row) => row.detail });
  }
  if (resource === 'nicknames') {
    columns.push({ key: 'approve', label: 'Aprovar', className: 'admin-grid-icon-column', render: (row) => iconAction('Aprovar apelido', row, <Check size={16} />, () => void review(row, 'approve')) });
    columns.push({ key: 'reject', label: 'Recusar', className: 'admin-grid-icon-column', render: (row) => iconAction('Recusar apelido', row, <X size={16} />, () => void review(row, 'reject')) });
  }
  if (resource === 'invitations') columns.push({ key: 'revoke', label: 'Revogar', className: 'admin-grid-icon-column', render: (row) => row.status !== 'revoked' ? iconAction('Revogar convite', row, <Trash2 size={16} />, () => void review(row, 'revoke')) : null });
  const newPath = resource === 'invitations' || resource === 'users' ? 'pessoas/convites/novo' : resource === 'pilots' ? 'operacao/pilotos/novo' : null;
  return <div className="admin-users-content">
    <AdminPageHeader title={titles[resource]} description="Consulte os registros da plataforma e filtre por empresa." count={query.loading || query.error ? undefined : query.data?.total} countLabel="registros encontrados" />
    {message && <AdminFeedback variant={messageError ? 'error' : 'success'}>{message}</AdminFeedback>}
    <AdminDataGrid columns={columns} rows={query.data?.items ?? []} rowKey={(row) => row.id} selectedKey={selectedId} onSelectRow={(row) => setSelectedId(row.id)} onOpenRow={resource === 'users' || resource === 'pilots' ? open : undefined} loading={query.loading} error={query.error ? 'Não foi possível carregar os registros.' : undefined} onRetry={query.refetch}
      toolbar={<AdminListToolbar actions={newPath ? <Link className="admin-console-primary-link" to={empresaId ? `/admin/empresas/${empresaId}/${newPath}` : `/admin/${newPath}`}><Plus size={16} />Novo</Link> : undefined}><AppSearchInput label="Buscar registros" value={search} placeholder="Buscar registros" onChange={(event) => setSearch(event.target.value)} />
        {companyFilter}
        {resource === 'users' && <AppSelect aria-label="Filtrar usuários" value={state.status} onChange={(event) => setState((previous) => ({ ...previous, status: event.target.value, page: 1 }))}><option value="">Todos os status</option><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="management">Gerência</option></AppSelect>}
        <AppSelect aria-label="Ordenar registros" value={state.sort} onChange={(event) => setState((previous) => ({ ...previous, sort: event.target.value, page: 1 }))}><option value="">Mais recentes</option><option value="asc">Nome A–Z</option><option value="desc">Nome Z–A</option></AppSelect>
        {(search || state.status || state.sort) && <AppButton variant="ghost" size="sm" onClick={() => { setSearch(''); setState((previous) => ({ ...previous, search: '', status: '', sort: '', page: 1 })); }}>Limpar filtros</AppButton>}
      </AdminListToolbar>}
      footer={<AdminGridPagination page={state.page} pageSize={state.pageSize} total={query.data?.total ?? 0} totalPages={query.data?.totalPages ?? 0} loading={query.loading} onPageChange={(page) => setState((previous) => ({ ...previous, page }))} onPageSizeChange={(pageSize) => setState((previous) => ({ ...previous, pageSize, page: 1 }))} />}
    />
  </div>;
}
