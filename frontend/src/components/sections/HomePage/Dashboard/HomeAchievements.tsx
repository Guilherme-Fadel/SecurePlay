import { ArrowRight, RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AchievementIcon } from '@/components/ui/visuals/AchievementIcon';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { useRecentAchievements } from '@/hooks/useAchievements';
import type { AchievementNode, RecentAchievements } from '@/services/achievements';
import { formatNumber } from './homeJourneyModel';

const keysLabel = (value: number) => `+${formatNumber(value)} ${value === 1 ? 'Chave Digital' : 'Chaves Digitais'}`;

const HEADING = <div><p className="hv-eyebrow">Para colecionar</p><h2 id="hv-ach-title" className="hv-display">Últimas conquistas</h2></div>;

function AchievementItem({ node, isNew }: { node: AchievementNode; isNew: boolean }) {
  const hasKeys = node.rewardPrestige !== null;
  return (
    <li className={`hv-ach-item${isNew ? ' is-new' : ''}`}>
      <span className="hv-ach-art" aria-hidden="true"><AchievementIcon slug={node.slug} icon={node.iconName ?? node.icon} artworkUrl={node.artworkUrl} size={56} /></span>
      <div className="hv-ach-copy">
        <span className="hv-ach-name"><strong>{node.name}</strong>{isNew && <span className="hv-new">Nova</span>}</span>
        {node.description && <small>{node.description}</small>}
        {(hasKeys || node.unlockedAt) && (
          <span className="hv-ach-meta">
            {hasKeys && <><DigitalKeyIcon size={16} />{keysLabel(node.rewardPrestige ?? 0)}</>}
            {hasKeys && node.unlockedAt && ' · '}
            {node.unlockedAt && <time dateTime={node.unlockedAt}>{new Date(node.unlockedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time>}
          </span>
        )}
      </div>
    </li>
  );
}

function AchievementSummary({ summary }: { summary: RecentAchievements['summary'] }) {
  const percent = summary.total > 0 ? Math.round((summary.unlocked / summary.total) * 100) : 0;
  return (
    <div className="hv-ach-sum">
      <div className="hv-ach-sum-copy">
        <strong>{formatNumber(summary.unlocked)} de {formatNumber(summary.total)} conquistas</strong>
        <div className="hv-bar" role="progressbar" aria-label="Conquistas obtidas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${summary.unlocked} de ${summary.total} conquistas`}><span style={{ width: `${percent}%` }} /></div>
      </div>
      <span className="hv-keys"><DigitalKeyIcon size={22} /><strong>{formatNumber(summary.prestigeBalance)}</strong>{summary.prestigeBalance === 1 ? 'Chave' : 'Chaves'}</span>
    </div>
  );
}

/** Últimas conquistas, resumo x/total e saldo de Chaves Digitais. */
export function HomeAchievements({ onOpen }: { onOpen: () => void }) {
  const { data, loading, error, refetch } = useRecentAchievements();

  if (loading && !data) {
    return <section className="hv-card hv-ach is-loading" aria-busy="true" aria-label="Carregando conquistas"><span className="hv-skeleton is-title" /><span className="hv-skeleton" /><span className="hv-skeleton" /></section>;
  }
  if (error && !data) {
    return (
      <section className="hv-card hv-ach" aria-labelledby="hv-ach-title">
        {HEADING}
        <p className="hv-muted" role="alert">Não foi possível carregar suas conquistas.</p>
        <AppButton variant="chunky" tone="ghost" size="sm" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={() => refetch()}>Tentar novamente</AppButton>
      </section>
    );
  }

  const recent = (data?.nodes ?? []).slice(0, 3);
  return (
    <section className="hv-card hv-ach" aria-labelledby="hv-ach-title">
      {HEADING}
      {recent.length > 0 ? (
        <ul className="hv-ach-list">
          {recent.map((node, index) => <AchievementItem key={node.id} node={node} isNew={index === 0} />)}
        </ul>
      ) : (
        <div className="hv-empty">
          <BrandCharacter className="hv-empty-art" blink />
          <strong>Nenhuma conquista ainda</strong>
          <p>Conclua uma aula para ganhar a primeira figurinha.</p>
        </div>
      )}
      {data?.summary && <AchievementSummary summary={data.summary} />}
      <button type="button" className="hv-link" onClick={onOpen}>Ver todas as conquistas <ArrowRight size={18} strokeWidth={2.6} aria-hidden="true" /></button>
    </section>
  );
}
