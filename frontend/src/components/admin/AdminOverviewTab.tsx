import type { ReactNode } from 'react';
import { Activity, ArrowUpRight, BookOpen, CheckCircle2, Clock3, Mail, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AdminCardHeading, AdminListState, AdminPageHeader } from '@/components/admin/AdminListLayout';
import { obterResumoAdministrativo } from '@/services/convites';
import './admin-overview.css';

type Tab = 'usuarios' | 'apelidos' | 'convites';
interface AdminOverviewTabProps { title?: string; headerActions?: ReactNode; empresaId?: number; platform?: boolean; empresaNome?: string; onNavigate?: (tab: Tab) => void; }
const number = (value: number) => value.toLocaleString('pt-BR');

export function AdminOverviewTab({ empresaId, platform = false, empresaNome, onNavigate, title = 'Visão geral', headerActions }: AdminOverviewTabProps) {
  const { data: summary, loading, error, refetch } = useCachedQuery(platform ? 'admin:platform:summary' : adminQueryKey('summary', empresaId), () => obterResumoAdministrativo(empresaId, platform), { refetchInterval: 60_000 });
  const students = summary?.alunosAtivos ?? 0;
  const participants = summary?.alunosComAulaConcluida ?? 0;
  const participation = students ? Math.round(participants / students * 100) : 0;
  const days = summary?.conclusoesPorDia ?? [];
  const weekTotal = days.reduce((sum, day) => sum + day.total, 0);
  const max = Math.max(1, ...days.map(day => day.total));
  const cards = summary ? [
    { label: 'Alunos com acesso', value: students, description: 'Cadastros de alunos com acesso liberado', icon: Users },
    { label: 'Participação nas aulas', value: `${participation}%`, description: `${number(participants)} de ${number(students)} alunos concluíram uma aula`, icon: Activity },
    { label: 'Aulas concluídas', value: summary.aulasConcluidas, description: 'Conclusões acumuladas dos alunos ativos', icon: BookOpen },
    { label: 'Alunos com conclusão recente', value: summary.alunosComConclusaoRecente, description: 'Pelo menos uma aula nos últimos 7 dias', icon: CheckCircle2 },
  ] : [];
  return <div className="admin-users-content admin-summary">
    <AdminPageHeader title={title} description="Resultados resumidos e acompanhamento da instituição." action={<>{headerActions}<AppButton variant="ghost" size="sm" onClick={refetch} disabled={loading}><RefreshCw size={15} />Atualizar</AppButton></>} />
    {loading ? <AdminListState kind="loading">Carregando o resumo da instituição...</AdminListState> : error ? <AdminListState kind="error" onRetry={refetch}>Não foi possível atualizar o resumo. Tente novamente.</AdminListState> : summary && <>
      <div className="admin-summary-intro"><div><span className="admin-summary-eyebrow">{platform ? 'RESUMO DA PLATAFORMA' : 'RESUMO DA INSTITUIÇÃO'}</span><h2>{platform ? 'Toda a plataforma em perspectiva' : empresaNome || 'Sua comunidade em perspectiva'}</h2><p>{platform ? `${number(summary.empresasTotal ?? 0)} instituições cadastradas · acompanhe os resultados consolidados e as pendências da plataforma.` : 'Acompanhe a participação e encontre os próximos passos da gestão.'}</p></div><span className="admin-summary-stamp"><Clock3 size={14} />{summary.atualizadoEm ? `Atualizado às ${new Date(summary.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Resumo acumulado'}</span></div>
      <div className="admin-summary-metrics">{cards.map(({ label, value, description, icon: Icon }) => <section key={label} className="admin-summary-metric"><span className="admin-summary-metric-icon"><Icon size={18} /></span><span>{label}</span><strong>{typeof value === 'number' ? number(value) : value}</strong><p>{description}</p></section>)}</div>
      <div className="admin-summary-columns">
        <section className="admin-summary-panel"><AdminCardHeading title="Conclusões na semana" description="Aulas concluídas por dia pelos alunos atualmente ativos. Horário de Brasília; hoje pode estar incompleto." icon={<Activity size={18} />} /><div className="admin-summary-panel-body"><div className="admin-summary-chart-total"><strong>{number(weekTotal)}</strong><span>aulas nos últimos 7 dias de calendário · Brasília</span></div>{weekTotal === 0 && <p className="admin-summary-empty">Ainda não há conclusões registradas nesta semana.</p>}<div className="admin-summary-chart" role="img" aria-label={`Conclusões diárias, no horário de Brasília: ${days.map(day => `${day.dia}: ${day.total}`).join('; ')}`}>{days.map(day => <div className="admin-summary-chart-day" key={day.dia}><span>{number(day.total)}</span><div className="admin-summary-chart-track"><i style={{ height: `${day.total / max * 100}%` }} /></div><small>{new Date(`${day.dia}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}</small></div>)}</div><p className="admin-summary-footnote">Cada conclusão corresponde a uma relação aluno–aula. Reacessos não aumentam a contagem.</p></div></section>
        <section className="admin-summary-panel"><AdminCardHeading title="Próximos passos" description="Atalhos para acompanhar os acessos e a moderação." icon={<ShieldCheck size={18} />} /><div className="admin-summary-panel-body admin-summary-tasks">{[
          { tab: 'apelidos' as const, icon: ShieldCheck, value: summary.apelidosPendentes, label: 'Apelidos para revisar', text: summary.apelidosPendentes ? 'Revise as solicitações de identificação.' : 'Nenhuma solicitação aguardando revisão.' },
          { tab: 'convites' as const, icon: Mail, value: summary.convitesAtivos, label: 'Convites disponíveis', text: 'Links válidos e com utilizações disponíveis.' },
          { tab: 'usuarios' as const, icon: Users, value: summary.usuariosInativos, label: 'Acessos desativados', text: 'Consulte os cadastros com acesso revogado.' },
        ].map(({ tab, icon: Icon, value, label, text }) => <div className="admin-summary-task" key={tab}><Icon size={18} /><div><strong>{number(value)} · {label}</strong><p>{text}</p></div>{onNavigate && <AppButton variant="ghost" size="sm" aria-label={`Abrir ${label.toLowerCase()}`} onClick={() => onNavigate(tab)}><ArrowUpRight size={17} /></AppButton>}</div>)}<div className="admin-summary-status"><CheckCircle2 size={16} /><span>{summary.apelidosPendentes ? 'Há solicitações de apelidos aguardando sua análise.' : 'A moderação de apelidos está em dia.'}</span></div></div></section>
      </div>
      <section className="admin-summary-panel"><AdminCardHeading title="Da entrada à participação" description="Relações entre cadastros, acesso e primeira conclusão. Base acumulada, sem comparação temporal." icon={<Users size={18} />} /><div className="admin-summary-relations"><div><span>Contas cadastradas</span><strong>{number(summary.usuariosAtivos + summary.usuariosInativos)}</strong><small>Todos os perfis no escopo atual</small></div><div><span>Contas com acesso</span><strong>{number(summary.usuariosAtivos)}</strong><small>Inclui alunos e administradores</small></div><div><span>Alunos com participação</span><strong>{number(participants)} <small>/ {number(students)}</small></strong><small>Com pelo menos uma aula concluída</small><progress max={students || 1} value={participants} aria-label="Alunos ativos com pelo menos uma aula concluída" /></div><div><span>Ainda sem conclusão</span><strong>{number(Math.max(0, students - participants))}</strong><small>Alunos ativos a acompanhar</small>{onNavigate && <AppButton variant="ghost" size="sm" onClick={() => onNavigate('usuarios')}>Ver usuários <ArrowUpRight size={14} /></AppButton>}</div></div></section>
      {students === 0 && <p className="admin-summary-footnote">A instituição ainda não tem alunos ativos. Cadastre alunos ou disponibilize um convite para começar.</p>}
      <p className="admin-summary-footnote">Acesso ativo indica permissão de entrada. Participação considera conclusões de aulas; não representa todos os acessos ou interações da plataforma.</p>
    </>}
  </div>;
}
