import type { ReactNode } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { CheckCircle2 } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AdminCardHeading, AdminListState, AdminPageHeader } from '@/components/admin/AdminListLayout';
import { obterResumoAdministrativo } from '@/services/convites';

interface AdminOverviewTabProps { title?: string; headerActions?: ReactNode; empresaId?: number; empresaNome?: string; onNavigate?: (tab: 'usuarios' | 'apelidos' | 'convites') => void; }

export function AdminOverviewTab({ empresaId, empresaNome, onNavigate, title = 'Painel administrativo', headerActions }: AdminOverviewTabProps) {
  const { data: summary, loading, error, refetch } = useCachedQuery(adminQueryKey('summary', empresaId), () => obterResumoAdministrativo(empresaId));

  const cards: Array<{ label: string; value: number; description: string; tab?: 'usuarios' | 'apelidos' | 'convites' }> = summary ? [
    { label: 'Usuários ativos', value: summary.usuariosAtivos, description: 'Com acesso liberado', tab: 'usuarios' as const },
    { label: 'Usuários inativos', value: summary.usuariosInativos, description: 'Acesso revogado', tab: 'usuarios' as const },
    { label: 'Apelidos pendentes', value: summary.apelidosPendentes, description: 'Aguardando moderação', tab: 'apelidos' as const },
    { label: 'Convites ativos', value: summary.convitesAtivos, description: 'Links ainda utilizáveis', tab: 'convites' as const },
    { label: 'Alunos que concluíram uma aula', value: summary.alunosComAulaConcluida, description: 'Primeira participação registrada' },
  ] : [];
  return <div className="admin-users-content">
    <AdminPageHeader title={title} action={headerActions} description={`Um resumo direto dos acessos e tarefas que precisam de acompanhamento${empresaNome ? ` em ${empresaNome}` : ''}.`} />
    {loading ? <AdminListState kind="loading">Carregando indicadores...</AdminListState> : error ? (
      <AdminListState kind="error" onRetry={refetch}>Não foi possível carregar os indicadores.</AdminListState>
    ) : summary && <>
      <div className="admin-overview-grid">{cards.map((card) => <section key={card.label} className="admin-overview-card"><small>{card.label}</small><strong>{card.value}</strong><p>{card.description}</p>{onNavigate && card.tab && <AppButton variant="ghost" size="sm" onClick={() => { if (card.tab) onNavigate(card.tab); }} aria-label={`Abrir ${card.tab} a partir de ${card.label}`}>Ver detalhes</AppButton>}</section>)}</div>
      <section className="admin-users-card admin-overview-note"><AdminCardHeading title="Leitura dos dados" description="Indicadores de gestão não usam posições nem estatísticas do ranking; estes continuam exclusivos de participantes." icon={<CheckCircle2 size={19} />} /></section>
    </>}
  </div>;
}
