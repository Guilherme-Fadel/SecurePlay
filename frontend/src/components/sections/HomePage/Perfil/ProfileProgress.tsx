import { BookOpen, Sparkles } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { levelProgress } from '@/lib/levelProgress';
import type { DashboardStats } from '@/services/dashboard';
import { formatNumber } from './profileModel';

interface ProfileProgressProps {
  stats: DashboardStats | null;
  statsLoading: boolean;
  statsError: boolean;
  /** Nível da sessão enquanto as estatísticas não chegam (comportamento anterior). */
  fallbackLevel: number | undefined;
  showGlobalRanking: boolean;
  showAchievements: boolean;
  onOpenAchievements: () => void;
}

function xpValueText(stats: DashboardStats | null, points: number, range: number) {
  if (!stats) return 'Aguardando dados de experiência';
  return `${formatNumber(points)} de ${formatNumber(range)} XP neste nível. Faltam ${formatNumber(stats.xpToNextLevel)} XP para o nível ${stats.level + 1}.`;
}

function syncLabel(loading: boolean, error: boolean) {
  if (loading) return 'Sincronizando';
  if (error) return 'Sem conexão com o resumo';
  return 'Atualizado agora';
}

/** Nível e XP sempre por levelProgress (backend é a autoridade; nada é recalculado aqui). */
export function ProfileProgress({ stats, statsLoading, statsError, fallbackLevel, showGlobalRanking, showAchievements, onOpenAchievements }: ProfileProgressProps) {
  return (
    <section className="pv-card pv-progress" aria-labelledby="pv-progress-title" aria-busy={(statsLoading && !stats) || undefined}>
      <header className="pv-card-head">
        <div>
          <p className="pv-eyebrow">Sua evolução</p>
          <h2 id="pv-progress-title" className="pv-display pv-card-title">Nível e XP</h2>
        </div>
        <small className="pv-muted">{syncLabel(statsLoading, statsError)}</small>
      </header>
      <div className="pv-card-body">
        <LevelXp stats={stats} fallbackLevel={fallbackLevel} />
        <StatsNotice stats={stats} loading={statsLoading} error={statsError} />
        <JourneyStats stats={stats} showGlobalRanking={showGlobalRanking} />
        {showAchievements && (
          <div className="pv-card-foot">
            <span className="pv-muted">Conquistas e itens cosméticos acompanham seu perfil.</span>
            <AppButton variant="chunky" tone="ghost" size="sm" icon={<Sparkles size={16} aria-hidden="true" />} onClick={onOpenAchievements}>
              Ver conquistas
            </AppButton>
          </div>
        )}
      </div>
    </section>
  );
}

function LevelXp({ stats, fallbackLevel }: { stats: DashboardStats | null; fallbackLevel: number | undefined }) {
  const { range, points, percent } = levelProgress(stats);
  const level = stats?.level ?? fallbackLevel;
  const valueText = xpValueText(stats, points, range);
  return (
    <div className="pv-level-row">
      <div className="pv-level" role="img" aria-label={level != null ? `Nível ${level}` : 'Nível indisponível'}>
        <small aria-hidden="true">NÍVEL</small><b aria-hidden="true">{level ?? '—'}</b>
      </div>
      <div className="pv-xp">
        <strong className="pv-xp-value">{stats ? `${formatNumber(points)} / ${formatNumber(range)} XP` : '— XP'}</strong>
        <span className="pv-muted">
          {stats ? `Faltam ${formatNumber(stats.xpToNextLevel)} XP para o nível ${stats.level + 1}` : 'Aguardando dados de evolução'}
        </span>
        <div className="pv-track" role="progressbar" aria-label="Progresso de experiência" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={valueText} title={valueText}>
          <span className="pv-track-fill" style={{ width: `${percent}%` }} />
          <i aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function StatsNotice({ stats, loading, error }: { stats: DashboardStats | null; loading: boolean; error: boolean }) {
  if (stats || loading) return null;
  if (error) return <p className="pv-inline-error" role="alert">Não foi possível carregar sua evolução agora. Tentaremos de novo em instantes.</p>;
  return <p className="pv-muted">Complete atividades para começar sua evolução.</p>;
}

function JourneyStats({ stats, showGlobalRanking }: { stats: DashboardStats | null; showGlobalRanking: boolean }) {
  return (
    <ul className={`pv-stats${showGlobalRanking ? '' : ' has-two'}`} aria-label="Resumo da jornada">
      <li><small>XP total</small><b>{stats ? formatNumber(stats.totalPoints) : '—'}</b></li>
      {showGlobalRanking && <li><small>Ranking global</small><b>{stats?.globalRanking != null ? `#${stats.globalRanking}` : '—'}</b></li>}
      <li><small>Desafios</small><b>{stats ? `${stats.completedChallenges}/${stats.totalActiveChallenges}` : '—'}</b></li>
    </ul>
  );
}

/** Próximo passo: estudo primeiro (Aprender antes de Jogos). */
export function ProfileNextStep({ onOpenLearn }: { onOpenLearn: () => void }) {
  return (
    <section className="pv-card pv-next" aria-labelledby="pv-next-title">
      <span className="pv-next-character" aria-hidden="true"><BrandCharacter expression="curious" /></span>
      <div className="pv-next-copy">
        <p className="pv-eyebrow">Próximo passo</p>
        <h2 id="pv-next-title" className="pv-display pv-card-title">Escolha sua próxima missão</h2>
        <p className="pv-muted">Comece pela próxima aula em Aprender; depois, treine o que aprendeu nos Jogos.</p>
      </div>
      <AppButton variant="chunky" tone="blue" size="md" icon={<BookOpen size={18} aria-hidden="true" />} onClick={onOpenLearn}>
        Ir para Aprender
      </AppButton>
    </section>
  );
}
