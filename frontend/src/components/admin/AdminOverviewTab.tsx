import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, TicketCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { obterResumoAdministrativo, type ResumoAdministrativo } from '@/services/convites';

interface AdminOverviewTabProps { empresaId?: number; empresaNome?: string; }
const emptySummary: ResumoAdministrativo = { usuariosAtivos: 0, usuariosInativos: 0, apelidosPendentes: 0, convitesAtivos: 0 };

export function AdminOverviewTab({ empresaId, empresaNome }: AdminOverviewTabProps) {
  const [summary, setSummary] = useState(emptySummary);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    void obterResumoAdministrativo(empresaId)
      .then((next) => { if (!cancelled) setSummary(next); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [empresaId]);

  const cards = [
    { label: 'Usuários ativos', value: summary.usuariosAtivos, description: 'Com acesso liberado', icon: <UserRoundCheck size={20} />, tone: 'primary' },
    { label: 'Usuários inativos', value: summary.usuariosInativos, description: 'Acesso revogado', icon: <UserRoundX size={20} />, tone: 'muted' },
    { label: 'Apelidos pendentes', value: summary.apelidosPendentes, description: 'Aguardando moderação', icon: <Clock3 size={20} />, tone: 'accent' },
    { label: 'Convites ativos', value: summary.convitesAtivos, description: 'Links ainda utilizáveis', icon: <TicketCheck size={20} />, tone: 'secondary' },
  ];
  return <div className="admin-users-content">
    <div className="admin-users-heading"><div><span className="admin-page-eyebrow">Visão geral {empresaNome ? `· ${empresaNome}` : 'da empresa'}</span><h1>Painel administrativo</h1><p>Um resumo direto dos acessos e tarefas que precisam de acompanhamento.</p></div></div>
    {error && <div className={cn('admin-feedback', 'is-error')} role="status"><AlertCircle size={17} />Não foi possível carregar os indicadores.</div>}
    <div className="admin-overview-grid">{cards.map((card) => <section key={card.label} className={cn('admin-overview-card', `is-${card.tone}`)}><span>{card.icon}</span><div><small>{card.label}</small><strong>{card.value}</strong><p>{card.description}</p></div></section>)}</div>
    <section className="admin-users-card admin-overview-note"><div className="admin-users-card-heading"><span className="admin-users-heading-icon"><CheckCircle2 size={19} /></span><div><h2>Leitura dos dados</h2><p>Indicadores de gestão não usam posições nem estatísticas do ranking; estes continuam exclusivos de participantes.</p></div></div></section>
  </div>;
}
