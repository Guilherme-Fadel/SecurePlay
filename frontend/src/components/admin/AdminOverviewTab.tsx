import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, TicketCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { cn } from '@/lib/utils';
import { AdminCardHeading, AdminListState, AdminPageHeader } from '@/components/admin/AdminListLayout';
import { obterResumoAdministrativo, type ResumoAdministrativo } from '@/services/convites';

interface AdminOverviewTabProps { empresaId?: number; empresaNome?: string; onNavigate?: (tab: 'usuarios' | 'apelidos' | 'convites') => void; }

export function AdminOverviewTab({ empresaId, empresaNome, onNavigate }: AdminOverviewTabProps) {
  const [summary, setSummary] = useState<ResumoAdministrativo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSummary(null);
    setError(false);
    void obterResumoAdministrativo(empresaId)
      .then((next) => { if (!cancelled) setSummary(next); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [empresaId, attempt]);

  const cards = summary ? [
    { label: 'Usuários ativos', value: summary.usuariosAtivos, description: 'Com acesso liberado', icon: <UserRoundCheck size={20} />, tone: 'primary', tab: 'usuarios' as const },
    { label: 'Usuários inativos', value: summary.usuariosInativos, description: 'Acesso revogado', icon: <UserRoundX size={20} />, tone: 'muted', tab: 'usuarios' as const },
    { label: 'Apelidos pendentes', value: summary.apelidosPendentes, description: 'Aguardando moderação', icon: <Clock3 size={20} />, tone: 'accent', tab: 'apelidos' as const },
    { label: 'Convites ativos', value: summary.convitesAtivos, description: 'Links ainda utilizáveis', icon: <TicketCheck size={20} />, tone: 'secondary', tab: 'convites' as const },
  ] : [];
  return <div className="admin-users-content">
    <AdminPageHeader title="Painel administrativo" description={`Um resumo direto dos acessos e tarefas que precisam de acompanhamento${empresaNome ? ` em ${empresaNome}` : ''}.`} />
    {loading ? <AdminListState kind="loading">Carregando indicadores...</AdminListState> : error ? (
      <AdminListState kind="error" onRetry={() => setAttempt((current) => current + 1)}>Não foi possível carregar os indicadores.</AdminListState>
    ) : summary && <>
      <div className="admin-overview-grid">{cards.map((card) => <section key={card.label} className={cn('admin-overview-card', `is-${card.tone}`)}><span>{card.icon}</span><div><small>{card.label}</small><strong>{card.value}</strong><p>{card.description}</p>{onNavigate && <AppButton variant="ghost" size="sm" onClick={() => onNavigate(card.tab)} aria-label={`Abrir ${card.tab} a partir de ${card.label}`}>Ver detalhes</AppButton>}</div></section>)}</div>
      <section className="admin-users-card admin-overview-note"><AdminCardHeading title="Leitura dos dados" description="Indicadores de gestão não usam posições nem estatísticas do ranking; estes continuam exclusivos de participantes." icon={<CheckCircle2 size={19} />} /></section>
    </>}
  </div>;
}
