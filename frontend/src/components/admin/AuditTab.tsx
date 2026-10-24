import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { useEffect, useState } from 'react';
import { ClipboardList, Settings2 } from 'lucide-react';
import { AdminCardHeading, AdminListCard, AdminListContent, AdminListState, AdminPagination, AdminPageHeader } from '@/components/admin/AdminListLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotebookLayout } from '@/hooks/useNotebookLayout';
import { listarAuditoriaEmpresa, listarEventosAuditoriaEmpresa, type AuditoriaPaginada, type EventosAuditoriaPaginados } from '@/services/admin';
import { AdminDataGrid, type AdminDataGridColumn } from '@/components/admin/console/AdminDataGrid';

interface AuditTabProps { empresaId?: number; empresaNome?: string; view?: 'both' | 'settings' | 'events'; }
const emptyAudit: AuditoriaPaginada = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };
const emptyEvents: EventosAuditoriaPaginados = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AuditTab({ empresaId, empresaNome, view = 'both' }: AuditTabProps) {
  const { user } = useCurrentUser();
  const notebook = useNotebookLayout();
  const pageSize = view === 'both' && notebook ? 2 : 25;
  const sessionKey = `secureplay-admin-audit:${user?.userId ?? 'unknown'}:${empresaId ?? 'none'}`;
  const [page, setPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);






  const [restoredKey, setRestoredKey] = useState<string | null>(null);


  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      const state = saved ? JSON.parse(saved) as { page?: number; eventsPage?: number } : {};
      setPage(typeof state.page === 'number' && Number.isInteger(state.page) && state.page > 0 ? state.page : 1);
      setEventsPage(typeof state.eventsPage === 'number' && Number.isInteger(state.eventsPage) && state.eventsPage > 0 ? state.eventsPage : 1);
    } catch { setPage(1); setEventsPage(1); }
    setRestoredKey(sessionKey);
  }, [sessionKey]);
  useEffect(() => {
    if (restoredKey !== sessionKey) return;
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ page, eventsPage })); } catch { /* Optional session preference. */ }
  }, [eventsPage, page, restoredKey, sessionKey]);
  const auditQuery = useCachedQuery(adminQueryKey('audit-settings', empresaId, { page, pageSize }), () => empresaId ? listarAuditoriaEmpresa(empresaId, page, pageSize) : Promise.reject(new Error('Empresa não selecionada')), { enabled: Boolean(empresaId) && view !== 'events' && restoredKey === sessionKey });
  const eventsQuery = useCachedQuery(adminQueryKey('audit-events', empresaId, { page: eventsPage, pageSize }), () => empresaId ? listarEventosAuditoriaEmpresa(empresaId, eventsPage, pageSize) : Promise.reject(new Error('Empresa não selecionada')), { enabled: Boolean(empresaId) && view !== 'settings' && restoredKey === sessionKey });
  const audit = auditQuery.data ?? emptyAudit;
  const events = eventsQuery.data ?? emptyEvents;
  const loading = auditQuery.loading;
  const error = Boolean(auditQuery.error);
  const eventsLoading = eventsQuery.loading;
  const eventsError = Boolean(eventsQuery.error);

  const actionLabel: Record<string, string> = { 'company.registration.updated': 'Dados cadastrais da empresa atualizados', 'usuario.inativado': 'Usuário inativado', 'usuario.reativado': 'Usuário reativado', 'convite.criado': 'Convite criado', 'convite.revogado': 'Convite revogado', 'apelido.aprovado': 'Apelido aprovado', 'apelido.rejeitado': 'Apelido rejeitado', 'aluno.link_redefinicao_emitido': 'Link de redefinição de acesso emitido' };

  if (view !== 'both') return <AuditGridView view={view} empresaNome={empresaNome} audit={audit} events={events} loading={view === 'settings' ? loading : eventsLoading} error={view === 'settings' ? error : eventsError} page={view === 'settings' ? page : eventsPage} onPageChange={view === 'settings' ? setPage : setEventsPage} onRetry={view === 'settings' ? auditQuery.refetch : eventsQuery.refetch} actionLabel={actionLabel} />;

  return <div className="admin-users-content">
    <AdminPageHeader title="Auditoria" description={`Histórico de alterações das configurações${empresaNome ? ` de ${empresaNome}` : ' da empresa'}.`} count={loading || error ? undefined : audit.total} countLabel="registros" countIcon={<ClipboardList size={18} />} />
    <AdminListCard loading={loading}>
      <AdminCardHeading title="Configurações alteradas" description="Somente alterações já registradas a partir do mecanismo de auditoria." icon={<Settings2 size={19} />} iconTone="accent" />
      <AdminListContent>{error ? <AdminListState kind="error" onRetry={auditQuery.refetch}>Não foi possível carregar a auditoria.</AdminListState> : loading ? <AdminListState kind="loading">Carregando auditoria...</AdminListState> : audit.items.length === 0 ? <AdminListState kind="empty">Nenhuma alteração de configuração registrada para esta empresa.</AdminListState> : <div className="admin-list-table-wrap"><table className="admin-list-table"><thead><tr><th>Data</th><th>Responsável</th><th>Alteração</th></tr></thead><tbody>{audit.items.map((item) => <tr key={item.id}><td data-label="Data">{formatDate(item.created_at)}</td><td data-label="Responsável"><strong>{item.alterado_por?.name ?? `Usuário #${item.alterado_por?.id ?? 'indisponível'}`}</strong><small>{item.alterado_por?.email ?? 'Registro histórico sem autor disponível'}</small></td><td data-label="Alteração">{item.configuracoes_alteradas === 1 ? '1 configuração atualizada' : `${item.configuracoes_alteradas} configurações atualizadas`}</td></tr>)}</tbody></table></div>}</AdminListContent>
      {!loading && !error && <AdminPagination page={page} totalPages={audit.totalPages} ariaLabel="Paginação de auditoria" disabled={loading} onPageChange={setPage} />}
    </AdminListCard>
    <AdminListCard className="admin-audit-events-card" loading={eventsLoading}><AdminCardHeading title="Eventos administrativos" description="Registros de ações administrativas realizadas a partir desta versão." icon={<ClipboardList size={19} />} /><AdminListContent>{eventsError ? <AdminListState kind="error" onRetry={eventsQuery.refetch}>Não foi possível carregar os eventos.</AdminListState> : eventsLoading ? <AdminListState kind="loading">Carregando eventos...</AdminListState> : events.items.length === 0 ? <AdminListState kind="empty">Nenhum evento administrativo registrado ainda.</AdminListState> : <div className="admin-list-table-wrap"><table className="admin-list-table"><thead><tr><th>Data</th><th>Responsável</th><th>Evento</th></tr></thead><tbody>{events.items.map((item) => <tr key={item.id}><td data-label="Data">{formatDate(item.created_at)}</td><td data-label="Responsável"><strong>{item.ator?.name ?? `Usuário #${item.ator?.id ?? 'indisponível'}`}</strong><small>{item.ator?.email ?? 'Registro histórico sem autor disponível'}</small></td><td data-label="Evento">{actionLabel[item.acao] ?? item.acao}</td></tr>)}</tbody></table></div>}</AdminListContent>{!eventsLoading && !eventsError && <AdminPagination page={eventsPage} totalPages={events.totalPages} ariaLabel="Paginação de eventos administrativos" disabled={eventsLoading} detail={`${events.total} eventos`} onPageChange={setEventsPage} />}</AdminListCard>
  </div>;
}

function AuditGridView({ view, empresaNome, audit, events, loading, error, page, onPageChange, onRetry, actionLabel }: { view: 'settings' | 'events'; empresaNome?: string; audit: AuditoriaPaginada; events: EventosAuditoriaPaginados; loading: boolean; error: boolean; page: number; onPageChange: (page: number) => void; onRetry: () => void; actionLabel: Record<string, string> }) {
  const settingsColumns: AdminDataGridColumn<AuditoriaPaginada['items'][number]>[] = [
    { key: 'date', label: 'Data', render: (item) => formatDate(item.created_at) },
    { key: 'actor', label: 'Responsável', render: (item) => <><strong>{item.alterado_por?.name ?? `Usuário #${item.alterado_por?.id ?? 'indisponível'}`}</strong><small>{item.alterado_por?.email ?? 'Registro histórico sem autor disponível'}</small></> },
    { key: 'changes', label: 'Alteração', render: (item) => item.configuracoes_alteradas === 1 ? '1 configuração atualizada' : `${item.configuracoes_alteradas} configurações atualizadas` },
  ];
  const eventColumns: AdminDataGridColumn<EventosAuditoriaPaginados['items'][number]>[] = [
    { key: 'date', label: 'Data', render: (item) => formatDate(item.created_at) },
    { key: 'actor', label: 'Responsável', render: (item) => <><strong>{item.ator?.name ?? `Usuário #${item.ator?.id ?? 'indisponível'}`}</strong><small>{item.ator?.email ?? 'Registro histórico sem autor disponível'}</small></> },
    { key: 'event', label: 'Evento', render: (item) => actionLabel[item.acao] ?? item.acao },
  ];
  const isSettings = view === 'settings';
  const heading = <AdminPageHeader title={isSettings ? 'Auditoria · Configurações' : 'Auditoria · Eventos administrativos'} description={`${isSettings ? 'Histórico de alterações de configurações' : 'Histórico de ações administrativas'}${empresaNome ? ` de ${empresaNome}` : ' da empresa'}.`} count={loading || error ? undefined : isSettings ? audit.total : events.total} countLabel="registros" countIcon={<ClipboardList size={18} />} />;
  if (isSettings) return <div className="admin-users-content">{heading}<AdminDataGrid columns={settingsColumns} rows={audit.items} rowKey={(item) => item.id} loading={loading} error={error ? 'Não foi possível carregar o histórico.' : undefined} onRetry={onRetry} empty="Nenhuma alteração de configuração registrada para esta empresa." footer={!loading && !error ? <AdminPagination alwaysVisible page={page} totalPages={audit.totalPages} ariaLabel="Paginação de auditoria de configurações" onPageChange={onPageChange} detail={`${audit.total} registros`} /> : null} /></div>;
  return <div className="admin-users-content">{heading}<AdminDataGrid columns={eventColumns} rows={events.items} rowKey={(item) => item.id} loading={loading} error={error ? 'Não foi possível carregar o histórico.' : undefined} onRetry={onRetry} empty="Nenhum evento administrativo registrado ainda." footer={!loading && !error ? <AdminPagination alwaysVisible page={page} totalPages={events.totalPages} ariaLabel="Paginação de eventos administrativos" onPageChange={onPageChange} detail={`${events.total} eventos`} /> : null} /></div>;
}
