import { Check } from 'lucide-react';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import type { DashboardStats, WeeklyStreak } from '@/services/dashboard';
import { levelProgress } from '@/lib/levelProgress';

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
const fmt = (value: number) => value.toLocaleString('pt-BR');

interface HomeLevelWeekProps {
  stats: DashboardStats | null;
  streak: WeeklyStreak | null;
}

function dayStatus(index: number, checked: boolean, todayIndex: number | null) {
  if (checked) return 'dia marcado';
  if (todayIndex === null) return 'sem atividade';
  if (index === todayIndex) return 'ainda não marcado';
  return index > todayIndex ? 'ainda não chegou' : 'sem atividade';
}

function xpValueText(stats: DashboardStats | null, points: number, range: number): string {
  if (!stats) return 'Aguardando dados de experiência';
  return `${fmt(points)} de ${fmt(range)} XP neste nível. Faltam ${fmt(stats.xpToNextLevel)} XP para o nível ${stats.level + 1}.`;
}

function WeekDays({ streak }: { streak: WeeklyStreak | null }) {
  const todayIndex = streak ? streak.todayIndex : null;
  const days = streak?.streak ?? 0;
  return (
    <div className="hv-week-days">
      <div className="hv-week-head">
        <h2 id="hv-week-title" className="hv-display">Sua semana</h2>
        <span>{days} {days === 1 ? 'dia seguido' : 'dias seguidos'}</span>
      </div>
      <ol className="hv-days" aria-label="Dias desta semana">
        {WEEK_DAYS.map((day, index) => {
          const checked = !!streak?.checkedDays[index];
          const today = index === todayIndex;
          return (
            <li key={day} className={`hv-day${checked ? ' is-on' : ''}${today ? ' is-today' : ''}`} aria-label={`${day}${today ? ' (hoje)' : ''}: ${dayStatus(index, checked, todayIndex)}`}>
              <i aria-hidden="true">{checked && <Check size={18} strokeWidth={3.4} />}</i>
              <span aria-hidden="true">{day}</span>
            </li>
          );
        })}
      </ol>
      <p className="hv-hint">{streak?.checkedToday ? 'Hoje já conta. Volte amanhã!' : 'Faça uma aula, a missão do dia ou um jogo para marcar hoje.'}</p>
    </div>
  );
}

/** Nível (sempre por levelProgress, autoridade do backend) e sequência semanal. */
export function HomeLevelWeek({ stats, streak }: HomeLevelWeekProps) {
  const { range, points, percent } = levelProgress(stats);
  const total = stats?.totalPoints ?? 0;
  const nextLevel = (stats?.level ?? 0) + 1;
  const valueText = xpValueText(stats, points, range);
  const rider = Math.max(3, Math.min(97, percent));

  return (
    <section className="hv-card hv-week" aria-labelledby="hv-week-title">
      <div className="hv-level" role="img" aria-label={stats ? `Nível ${stats.level}` : 'Nível indisponível'}>
        <small>NÍVEL</small><b>{stats ? stats.level : '—'}</b>
      </div>
      <div className="hv-xp">
        <p className="hv-eyebrow"><strong>{fmt(total)}</strong> XP no total</p>
        <div className="hv-xp-line">
          <strong>{stats ? `${fmt(points)} / ${fmt(range)} XP` : '— XP'}</strong>
          {stats && <span>Faltam {fmt(stats.xpToNextLevel)} XP para o nível {nextLevel}</span>}
        </div>
        <div className="hv-track" role="progressbar" aria-label="Progresso de experiência" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={valueText} title={valueText}>
          <span className="hv-track-fill" style={{ width: `${percent}%` }} />
          <i aria-hidden="true" />
          <span className="hv-rider" style={{ left: `${rider}%` }} aria-hidden="true"><BrandCharacter /></span>
        </div>
      </div>
      <WeekDays streak={streak} />
    </section>
  );
}
