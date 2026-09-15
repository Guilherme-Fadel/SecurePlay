import { useState } from 'react';
import { PageTransition } from '@/components/shared/PageTransition';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { Avatar } from '@/components/ui/visuals/Avatar';
import type { RankingEntry } from '@/services/dashboard';
import championBannersArtwork from '@/assets/static/ranking/ranking-champion-banners-pixel-v1.webp';
import galleryEmblem from '@/assets/static/mission-room/missions-room-emblem.png';
import controlEmblems from '@/assets/static/ranking/ranking-controls-emblems-pixel-v1.png';
import '@/styles/ranking-ui.css';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';

const formatXp = (value: number) => `${value.toLocaleString('pt-BR')} XP`;
type RankingScope = 'global' | 'company';

export function Ranking() {
  const features = useCompanyFeatures();
  const [scope, setScope] = useState<RankingScope>(features.globalRanking ? 'global' : 'company');
  // Isolate pending responses and error state when the selected scope changes.
  const effectiveScope = features.globalRanking ? scope : 'company';
  return <RankingContent key={effectiveScope} scope={effectiveScope} onScopeChange={setScope} />;
}

function RankingContent({ scope, onScopeChange }: {
  scope: RankingScope;
  onScopeChange: (scope: RankingScope) => void;
}) {
  const features = useCompanyFeatures();
  const { ranking, loading, error, refetch } = useDashboardRanking(scope);

  return (
    <PageTransition>
      <div className="app-page ranking-page">
        <header className="ranking-heading">
          <img src={galleryEmblem} alt="" width={48} height={48} />
          <div><h1 className="ranking-page-title">Galeria de Honra</h1><p>Cada aprendizado faz parte da sua conquista.</p></div>
        </header>
        {loading && !ranking ? (
          <div className="ranking-status" role="status">Carregando o mural de honra…</div>
        ) : error || !ranking ? (
          <div className="ranking-status" role="alert">
            <h2>Não foi possível carregar o ranking</h2>
            <p>Tente novamente para atualizar a classificação.</p>
            <AppButton onClick={refetch}>Tentar novamente</AppButton>
          </div>
        ) : (
          <div className="ranking-art-scroll">
            <section className="ranking-artboard" aria-label={`Mural de Honra — ${scope === 'global' ? 'Global' : 'Minha instituição'}`}>
              <div className="ranking-gallery" aria-label="Três primeiros colocados">
                <div className="ranking-gallery-stage">
                  <div className="ranking-leaders">
                    <img className="ranking-banners-art" src={championBannersArtwork} width={1080} height={720} alt="" draggable={false} />
                    {ranking.top.slice(0, 3).map(entry => (
                      <div key={entry.id} className={`ranking-leader ranking-leader-${entry.position}`} role="group" aria-label={`${entry.position}º lugar`}>
                        <Avatar name={entry.name} imageUrl={entry.profileImageUrl} className="ranking-leader-avatar" />
                      </div>
                    ))}
                  </div>
                  <ol className="ranking-leader-legends">
                    {ranking.top.slice(0, 3).map(entry => (
                      <li key={entry.id} className={`ranking-leader-legend ranking-legend-${entry.position}`}>
                        <span className="ranking-sr-only">{entry.position}º lugar: </span>
                        <strong className="ranking-leader-name" title={entry.name}>{entry.name}</strong>
                        <strong className="ranking-leader-xp">{formatXp(entry.points)}</strong>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <section className="ranking-classification" aria-label="Classificação">
                <h2 className="ranking-scope-label">Classificação</h2>
                <div className="ranking-board-controls" aria-label="Controles do mural">
                  <div className="ranking-scope-control">
                    <div className="ranking-scope-switch" role="group" aria-label="Escopo do ranking">
                      {features.globalRanking && (
                        <button type="button" aria-pressed={scope === 'global'} onClick={() => onScopeChange('global')}>
                          <RankingControlIcon position="global" />
                          Global
                        </button>
                      )}
                      <button type="button" aria-pressed={scope === 'company'} onClick={() => onScopeChange('company')}
                        disabled={!ranking.companyAvailable && scope !== 'company'}
                        aria-describedby={!ranking.companyAvailable ? 'ranking-no-company' : undefined}>
                        <RankingControlIcon position="classroom" />
                        Minha instituição
                      </button>
                    </div>
                  </div>
                  <button type="button" className="ranking-refresh-control" onClick={refetch} disabled={loading}>
                    <RankingControlIcon position="refresh" />
                    <span>{loading ? 'Atualizando…' : 'Atualizar'}</span>
                  </button>
                </div>
                {!ranking.companyAvailable && <small id="ranking-no-company" className="ranking-scope-hint">Você ainda não faz parte de uma instituição.</small>}
                <div className="ranking-art-list" role="region" aria-label="Classificação completa" tabIndex={0}>
                  {ranking.top.length ? ranking.top.map(entry => <RankingRow key={entry.id} entry={entry} />) : (
                    <p className="ranking-empty">O mural está esperando seus primeiros aventureiros.</p>
                  )}
                </div>
                <div className="ranking-art-personal" aria-label="Sua posição">
                  <span className="ranking-personal-label">Sua posição</span>
                  <RankingRow entry={ranking.currentUser} personal />
                </div>
              </section>
            </section>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function RankingControlIcon({ position }: { position: 'global' | 'classroom' | 'refresh' }) {
  return (
    <span className={`ranking-control-icon ranking-control-icon-${position}`} aria-hidden="true">
      <img src={controlEmblems} alt="" draggable={false} />
    </span>
  );
}

function RankingRow({ entry, personal = false }: { entry: RankingEntry; personal?: boolean }) {
  return (
    <div className={`ranking-art-row${personal ? ' is-personal' : ''}`}>
      <span className="ranking-art-position" aria-label={`${entry.position}º lugar`}>#{entry.position}</span>
      <Avatar name={entry.name} imageUrl={entry.profileImageUrl} className="ranking-art-avatar" />
      <strong className="ranking-art-name" title={entry.name}>{(entry.isCurrentUser || personal) && <span className="ranking-sr-only">Você: </span>}{entry.name}</strong>
      <strong className="ranking-art-xp">{formatXp(entry.points)}</strong>
    </div>
  );
}
