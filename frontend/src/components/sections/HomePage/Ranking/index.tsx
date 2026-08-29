import { useMemo, useState, type ReactNode } from 'react';
import {
  Building2,
  Crown,
  Globe2,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSectionHeader } from '@/components/ui/visuals/AppSectionHeader';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useDashboardRanking } from '@/hooks/useDashboard';
import type { RankingEntry } from '@/services/dashboard';

type RankingScope = 'global' | 'company';

const formatXp = (value: number) => `${value.toLocaleString('pt-BR')} XP`;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function Ranking() {
  const [scope, setScope] = useState<RankingScope>('global');
  const { ranking, loading, error, refetch } = useDashboardRanking(scope);

  const podium = useMemo(() => {
    const firstThree = ranking?.top.slice(0, 3) ?? [];
    return [
      firstThree[1] ? { entry: firstThree[1], place: 2 } : null,
      firstThree[0] ? { entry: firstThree[0], place: 1 } : null,
      firstThree[2] ? { entry: firstThree[2], place: 3 } : null,
    ].filter(Boolean) as Array<{ entry: RankingEntry; place: number }>;
  }, [ranking]);

  if (loading && !ranking) {
    return <RankingSkeleton />;
  }

  if (error || !ranking) {
    return (
      <PageTransition>
        <div className="app-page ranking-page">
          <AppSectionHeader title="Ranking" subtitle="Acompanhe sua evolução na comunidade." />
          <InfoCard raised className="ranking-error-state">
            <Trophy size={32} />
            <h3>Não foi possível carregar o ranking</h3>
            <p>Tente novamente para atualizar a classificação.</p>
            <AppButton icon={<RefreshCw size={16} />} onClick={refetch}>Tentar novamente</AppButton>
          </InfoCard>
        </div>
      </PageTransition>
    );
  }

  const { currentUser, summary } = ranking;
  const nextTarget = currentUser.points + summary.pointsToNextPosition;
  const nextProgress = currentUser.position === 1
    ? 100
    : Math.min(100, Math.round((currentUser.points / Math.max(nextTarget, 1)) * 100));

  return (
    <PageTransition>
      <div className="app-page ranking-page">
        <AppSectionHeader
          title="Ranking"
          subtitle="Compare seu desempenho, acompanhe a equipe e conquiste novas posições."
          action={(
            <AppButton variant="ghost" size="sm" icon={<RefreshCw size={15} />} onClick={refetch}>
              Atualizar
            </AppButton>
          )}
        />

        <InfoCard raised className="ranking-arena">
          <div className="ranking-arena-accent" aria-hidden="true" />
          <div className="ranking-arena-header">
            <div>
              <span className="ranking-eyebrow"><Sparkles size={14} /> Liga SecurePlay</span>
              <h3>{ranking.scopeLabel}</h3>
              <p>{ranking.totalParticipants} participantes competindo por XP</p>
            </div>

            <div className="ranking-scope-switch" role="tablist" aria-label="Escopo do ranking">
              <button
                type="button"
                role="tab"
                aria-selected={scope === 'global'}
                className={scope === 'global' ? 'is-active' : ''}
                onClick={() => setScope('global')}
              >
                <Globe2 size={15} /> Global
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scope === 'company'}
                className={scope === 'company' ? 'is-active' : ''}
                disabled={!ranking.companyAvailable}
                title={ranking.companyAvailable ? ranking.company?.name : 'Usuário sem empresa vinculada'}
                onClick={() => setScope('company')}
              >
                <Building2 size={15} /> Empresa
              </button>
            </div>
          </div>

          <div className="ranking-podium" aria-label="Pódio dos três primeiros colocados">
            {podium.map(({ entry, place }) => (
              <PodiumPlayer key={`${entry.name}-${place}`} entry={entry} place={place} />
            ))}
          </div>
        </InfoCard>

        <div className="ranking-content-grid">
          <InfoCard raised className="ranking-table-card">
            <div className="ranking-card-heading">
              <div>
                <span><Users size={15} /> Classificação</span>
                <p>
                  {ranking.totalParticipants <= 20
                    ? `${ranking.totalParticipants} participantes neste escopo`
                    : 'Os 20 melhores no escopo selecionado'}
                </p>
              </div>
              <strong>{ranking.scope === 'global' ? 'Global' : ranking.company?.name}</strong>
            </div>

            <div className="ranking-table-labels" aria-hidden="true">
              <span>Posição e participante</span>
              <span>Desempenho</span>
            </div>

            <div className="ranking-list">
              {ranking.top.map((entry) => (
                <RankingRow
                  key={`${entry.position}-${entry.name}`}
                  entry={entry}
                  leaderPoints={summary.leaderPoints}
                  showCompany={ranking.scope === 'global'}
                />
              ))}
            </div>
          </InfoCard>

          <aside className="ranking-player-column">
            <InfoCard raised className="ranking-player-card">
              <div className="ranking-player-topline">
                <span>Sua posição</span>
                <div><ShieldCheck size={15} /> {ranking.scope === 'global' ? 'Global' : 'Empresa'}</div>
              </div>

              <div className="ranking-player-identity">
                <div className="ranking-player-avatar">{initials(currentUser.name)}</div>
                <div>
                  <strong>{currentUser.name}</strong>
                  <span>{currentUser.companyName ?? 'Comunidade SecurePlay'}</span>
                </div>
                <div className="ranking-player-position">#{currentUser.position}</div>
              </div>

              <div className="ranking-player-score">
                <div>
                  <span>XP acumulado</span>
                  <strong>{currentUser.points.toLocaleString('pt-BR')}</strong>
                </div>
                <div>
                  <span>Nível</span>
                  <strong>{currentUser.level}</strong>
                </div>
              </div>

              <div className="ranking-next-goal">
                <div>
                  <span><Target size={14} /> Próximo objetivo</span>
                  <strong>
                    {currentUser.position === 1
                      ? 'Você lidera este ranking'
                      : `${summary.pointsToNextPosition.toLocaleString('pt-BR')} XP para subir`}
                  </strong>
                </div>
                <div className="ranking-next-progress"><i style={{ width: `${nextProgress}%` }} /></div>
              </div>

              <div className="ranking-player-insights">
                <div><TrendingMetric icon={<Zap size={15} />} value={`${summary.percentile}%`} label="à frente dos participantes" /></div>
                <div><TrendingMetric icon={<Crown size={15} />} value={formatXp(summary.pointsBehindLeader)} label="distância para a liderança" /></div>
              </div>
            </InfoCard>

            <div className="ranking-scope-callout">
              <div className="ranking-callout-icon">
                {ranking.scope === 'global' ? <Building2 size={20} /> : <Globe2 size={20} />}
              </div>
              <div>
                <strong>{ranking.scope === 'global' ? 'Disputa saudável na empresa' : 'Pronto para o cenário global?'}</strong>
                <p>
                  {ranking.scope === 'global'
                    ? ranking.companyAvailable
                      ? `Compare sua posição apenas com pessoas da ${ranking.company?.name}.`
                      : 'Vincule seu perfil a uma empresa para liberar este comparativo.'
                    : 'Volte ao ranking global para comparar seu desempenho com toda a comunidade.'}
                </p>
              </div>
              <AppButton
                variant="soft"
                size="sm"
                disabled={ranking.scope === 'global' && !ranking.companyAvailable}
                onClick={() => setScope(ranking.scope === 'global' ? 'company' : 'global')}
              >
                {ranking.scope === 'global' ? 'Ver empresa' : 'Ver global'}
              </AppButton>
            </div>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}

function PodiumPlayer({ entry, place }: { entry: RankingEntry; place: number }) {
  const medalLabel = place === 1 ? 'Ouro' : place === 2 ? 'Prata' : 'Bronze';
  return (
    <div className={`ranking-podium-player place-${place}`}>
      <div className="ranking-podium-avatar-wrap">
        {place === 1 && <Crown className="ranking-podium-crown" size={22} />}
        <div className="ranking-podium-avatar">{initials(entry.name)}</div>
        <span className="ranking-podium-place">{place}</span>
      </div>
      <strong>{entry.name}</strong>
      <span>Nível {entry.level} · {formatXp(entry.points)}</span>
      <div className="ranking-podium-platform">
        <Medal size={18} />
        <small>{medalLabel}</small>
      </div>
    </div>
  );
}

function RankingRow({
  entry,
  leaderPoints,
  showCompany,
}: {
  entry: RankingEntry;
  leaderPoints: number;
  showCompany: boolean;
}) {
  const progress = leaderPoints > 0 ? Math.max(4, Math.round((entry.points / leaderPoints) * 100)) : 0;
  return (
    <div className={`ranking-row ${entry.isCurrentUser ? 'is-current' : ''}`}>
      <div className={`ranking-row-position rank-${entry.position}`}>
        {entry.position <= 3 ? <Trophy size={14} /> : entry.position}
      </div>
      <div className="ranking-row-avatar">{initials(entry.name)}</div>
      <div className="ranking-row-person">
        <strong>{entry.name}{entry.isCurrentUser && <em>Você</em>}</strong>
        <span>{showCompany && entry.companyName ? entry.companyName : `Nível ${entry.level}`}</span>
      </div>
      <div className="ranking-row-performance">
        <strong>{entry.points.toLocaleString('pt-BR')} XP</strong>
        <div><i style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  );
}

function TrendingMetric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </>
  );
}

function RankingSkeleton() {
  return (
    <PageTransition>
      <div className="app-page ranking-page ranking-skeleton" aria-label="Carregando ranking">
        <div className="ranking-skeleton-line is-title" />
        <div className="ranking-skeleton-arena" />
        <div className="ranking-skeleton-grid">
          <div />
          <div />
        </div>
      </div>
    </PageTransition>
  );
}
