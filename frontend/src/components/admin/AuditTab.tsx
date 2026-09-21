import { useEffect, useState } from 'react';
import { AlertCircle, ClipboardList, Settings2 } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { cn } from '@/lib/utils';
import { listarAuditoriaEmpresa, type AuditoriaPaginada } from '@/services/admin';

interface AuditTabProps { empresaId?: number; empresaNome?: string; }
const emptyAudit: AuditoriaPaginada = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function AuditTab({ empresaId, empresaNome }: AuditTabProps) {
  const [page, setPage] = useState(1);
  const [audit, setAudit] = useState(emptyAudit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => { setPage(1); }, [empresaId]);
  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    void listarAuditoriaEmpresa(empresaId, page)
      .then((next) => { if (!cancelled) setAudit(next); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [empresaId, page]);

  return <div className="admin-users-content">
    <div className="admin-users-heading"><div><span className="admin-page-eyebrow">Rastreabilidade {empresaNome ? `· ${empresaNome}` : ''}</span><h1>Auditoria</h1><p>Histórico de alterações das configurações da empresa.</p></div><div className="admin-users-stat"><ClipboardList size={18} /><span><strong>{audit.total}</strong> registros</span></div></div>
    {error && <div className={cn('admin-feedback', 'is-error')} role="status"><AlertCircle size={17} />Não foi possível carregar a auditoria.</div>}
    <section className="admin-users-card" aria-busy={loading}>
      <div className="admin-users-card-heading"><span className="admin-users-heading-icon is-accent"><Settings2 size={19} /></span><div><h2>Configurações alteradas</h2><p>Somente alterações já registradas a partir do mecanismo de auditoria.</p></div></div>
      {audit.items.length === 0 && !loading ? <p className="admin-users-empty">Nenhuma alteração de configuração registrada para esta empresa.</p> : <div className="admin-pending-nicknames-table-wrap"><table className="admin-audit-table"><thead><tr><th>Data</th><th>Responsável</th><th>Alteração</th></tr></thead><tbody>{audit.items.map((item) => <tr key={item.id}><td data-label="Data">{formatDate(item.created_at)}</td><td data-label="Responsável"><strong>{item.alterado_por?.name ?? `Usuário #${item.alterado_por?.id ?? 'indisponível'}`}</strong><small>{item.alterado_por?.email ?? 'Registro histórico sem autor disponível'}</small></td><td data-label="Alteração">{item.configuracoes_alteradas === 1 ? '1 configuração atualizada' : `${item.configuracoes_alteradas} configurações atualizadas`}</td></tr>)}</tbody></table></div>}
      {audit.totalPages > 1 && <nav className="admin-table-pagination" aria-label="Paginação de auditoria"><AppButton variant="ghost" size="sm" disabled={page === 1 || loading} onClick={() => setPage((current) => current - 1)}>Anterior</AppButton><span>Página {page} de {Math.max(1, audit.totalPages)}</span><AppButton variant="ghost" size="sm" disabled={page >= audit.totalPages || loading} onClick={() => setPage((current) => current + 1)}>Próxima</AppButton></nav>}
    </section>
  </div>;
}
