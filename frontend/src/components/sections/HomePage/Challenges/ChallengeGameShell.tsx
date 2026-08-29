import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowLeft,
  LoaderCircle,
  Trophy,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { cn } from '@/lib/utils';

interface MissionMetric {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}

interface ChallengeGameShellProps {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  onExit: () => void;
  children: ReactNode;
  metrics?: MissionMetric[];
  progress?: number;
  progressLabel?: string;
  className?: string;
}

export function ChallengeGameShell({
  title,
  eyebrow,
  description,
  icon: Icon,
  onExit,
  children,
  metrics = [],
  progress,
  progressLabel,
  className,
}: ChallengeGameShellProps) {
  const safeProgress = Math.max(0, Math.min(100, progress ?? 0));

  return (
    <div className={cn('arcade-mission-shell', className)}>
      <header className="arcade-mission-header">
        <AppButton
          onClick={onExit}
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={15} />}
          className="arcade-mission-back"
        >
          Voltar
        </AppButton>

        <div className="arcade-mission-identity">
          <div className="arcade-mission-icon"><Icon size={22} /></div>
          <div>
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>

        <div className="arcade-mission-metrics">
          {metrics.map(({ icon: MetricIcon, label, value }) => (
            <div key={label} className="arcade-mission-metric">
              <MetricIcon size={14} />
              <div><span>{label}</span><strong>{value}</strong></div>
            </div>
          ))}
        </div>
      </header>

      {progress !== undefined && (
        <div className="arcade-mission-progress" aria-label={progressLabel}>
          <div style={{ width: `${safeProgress}%` }} />
          {progressLabel && <span>{progressLabel}</span>}
        </div>
      )}

      <main className="arcade-mission-stage">{children}</main>
    </div>
  );
}

interface ChallengeGameStateProps {
  title: string;
  description: string;
  tone?: 'loading' | 'error' | 'empty';
  onExit?: () => void;
}

export function ChallengeGameState({
  title,
  description,
  tone = 'loading',
  onExit,
}: ChallengeGameStateProps) {
  const Icon = tone === 'loading' ? LoaderCircle : AlertTriangle;
  return (
    <div className={cn('arcade-game-state', `is-${tone}`)}>
      <div className="arcade-game-state-icon"><Icon size={28} /></div>
      <strong>{title}</strong>
      <p>{description}</p>
      {onExit && <AppButton variant="ghost" size="sm" onClick={onExit}>Voltar aos jogos</AppButton>}
    </div>
  );
}

interface ChallengeGameResultProps {
  title: string;
  description: string;
  xp: number;
  note?: ReactNode;
  onExit: () => void;
  children?: ReactNode;
}

export function ChallengeGameResult({
  title,
  description,
  xp,
  note,
  onExit,
  children,
}: ChallengeGameResultProps) {
  return (
    <div className="arcade-result-screen">
      <div className="arcade-result-summary">
        <div className="arcade-result-emblem"><Trophy size={28} /></div>
        <span>Missão concluída</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="arcade-result-xp"><Zap size={19} /><strong>+{xp} XP</strong></div>
        {note && <div className="arcade-result-note">{note}</div>}
        <AppButton onClick={onExit} icon={<ArrowLeft size={15} />}>Voltar aos jogos</AppButton>
      </div>
      {children && <div className="arcade-result-review">{children}</div>}
    </div>
  );
}
