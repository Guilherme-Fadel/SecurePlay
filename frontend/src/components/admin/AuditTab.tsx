import { useEffect, useState } from 'react';
import { ClipboardList, Settings2 } from 'lucide-react';
import { AdminListCard, AdminListContent, AdminListState, AdminPagination, AdminPageHeader } from '@/components/admin/AdminListLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listarAuditoriaEmpresa, listarEventosAuditoriaEmpresa, type AuditoriaPaginada, type EventosAuditoriaPaginados } from '@/services/admin';

interface AuditTabProps { empresaId?: number; empresaNome?: string; }
const emptyAudit: AuditoriaPaginada = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };
const emptyEvents: EventosAuditoriaPaginados = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AuditTab({ empresaId, empresaNome }: AuditTabProps) {
  const { user } = useCurrentUser();
  const sessionKey = `secureplay-admin-audit:${user?.userId ?? 'unknown'}:${empresaId ?? 'none'}`;
  const [page, setPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [audit, setAudit] = useState(emptyAudit);
  const [events, setEvents] = useState(emptyEvents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const [auditReload, setAuditReload] = useState(0);
  const [eventsReload, setEventsReload] = useState(0);
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
  useEffect(() => {
    if (restoredKey !== sessionKey) return;
    if (!empresaId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setAudit(emptyAudit);
    void listarAuditoriaEmpresa(empresaId, page)
      .then((next) => { if (!cancelled) setAudit(next); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [auditReload, empresaId, page, restoredKey, sessionKey]);
  useEffect(() => {
    if (restoredKey !== sessionKey) return;
    if (!empresaId) return;
    let cancelled = false;
    setEventsLoading(true);
    setEventsError(false);
    setEvents(emptyEvents);
    void listarEventosAuditoriaEmpresa(empresaId, eventsPage)
      .then((next) => { if (!cancelled) setEvents(next); })
      .catch(() => { if (!cancelled) setEventsError(true); })
      .finally(() => { if (!cancelled) setEventsLoading(false); });
    return () => { cancelled = true; };
  }, [empresaId, eventsPage, eventsReload, restoredKey, sessionKey]);

  const actionLabel: Record<string, string> = { 'usuario.inativado': 'Usuário inativado', 'convite.criado': 'Convite criado', 'convite.revogado': 'Convite revogado', 'apelido.aprovado': 'Apelido aprovado', 'apelido.rejeitado': 'Apelido rejeitado' };

  return <div className="admin-users-content">
    <AdminPageHeader eyebrow={`Rastreabilidade${empresaNome ? ` · ${empresaNome}` : ''}`} title="Auditoria" description="Histórico de alterações das configurações da empresa." count={loading || error ? undefined : audit.total} countLabel="registros" countIcon={<ClipboardList size={18} />} />
    <AdminListCard loading={loading}>
      <div className="admin-users-card-heading"><span className="admin-users-heading-icon is-accent"><Settings2 size={19} /></span><div><h2>Configurações alteradas</h2><p>Somente alterações já registradas a partir do mecanismo de auditoria.</p></div></div>
      <AdminListContent>{error ? <AdminListState kind="error" onRetry={() => setAuditReload((current) => current + 1)}>Não foi possível carregar a auditoria.</AdminListState> : loading ? <AdminListState kind="loading">Carregando auditoria...</AdminListState> : audit.items.length === 0 ? <AdminListState kind="empty">Nenhuma alteração de configuração registrada para esta empresa.</AdminListState> : <div className="admin-list-table-wrap"><table className="admin-list-table"><thead><tr><th>Data</th><th>Responsável</th><th>Alteração</th></tr></thead><tbody>{audit.items.map((item) => <tr key={item.id}><td data-label="Data">{formatDate(item.created_at)}</td><td data-label="Responsável"><strong>{item.alterado_por?.name ?? `Usuário #${item.alterado_por?.id ?? 'indisponível'}`}</strong><small>{item.alterado_por?.email ?? 'Registro histórico sem autor disponível'}</small></td><td data-label="Alteração">{item.configuracoes_alteradas === 1 ? '1 configuração atualizada' : `${item.configuracoes_alteradas} configurações atualizadas`}</td></tr>)}</tbody></table></div>}</AdminListContent>
      {!loading && !error && <AdminPagination page={page} totalPages={audit.totalPages} ariaLabel="Paginação de auditoria" disabled={loading} onPageChange={setPage} />}
    </AdminListCard>
    <AdminListCard className="admin-audit-events-card" loading={eventsLoading}><div className="admin-users-card-heading"><span className="admin-users-heading-icon"><ClipboardList size={19} /></span><div><h2>Eventos administrativos</h2><p>Registros de ações administrativas realizadas a partir desta versão.</p></div></div><AdminListContent>{eventsError ? <AdminListState kind="error" onRetry={() => setEventsReload((current) => current + 1)}>Não foi possível carregar os eventos.</AdminListState> : eventsLoading ? <AdminListState kind="loading">Carregando eventos...</AdminListState> : events.items.length === 0 ? <AdminListState kind="empty">Nenhum evento administrativo registrado ainda.</AdminListState> : <div className="admin-list-table-wrap"><table className="admin-list-table"><thead><tr><th>Data</th><th>Responsável</th><th>Evento</th></tr></thead><tbody>{events.items.map((item) => <tr key={item.id}><td data-label="Data">{formatDate(item.created_at)}</td><td data-label="Responsável"><strong>{item.ator?.name ?? `Usuário #${item.ator?.id ?? 'indisponível'}`}</strong><small>{item.ator?.email ?? 'Registro histórico sem autor disponível'}</small></td><td data-label="Evento">{actionLabel[item.acao] ?? item.acao}</td></tr>)}</tbody></table></div>}</AdminListContent>{!eventsLoading && !eventsError && <AdminPagination page={eventsPage} totalPages={events.totalPages} ariaLabel="Paginação de eventos administrativos" disabled={eventsLoading} detail={`${events.total} eventos`} onPageChange={setEventsPage} />}</AdminListCard>
  </div>;
}
