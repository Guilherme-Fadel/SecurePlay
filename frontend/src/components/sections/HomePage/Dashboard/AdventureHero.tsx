import { BookOpen, Check, Play, Star } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import type { CurrentUser } from '@/services/me';
import type { DashboardStats, JourneyNodeData, WeeklyStreak } from '@/services/dashboard';
import heroArt from '@/assets/dashboard/welcome-adventurer-pixel-v5.png';
import levelShield from '@/assets/dashboard/level-shield-pixel-v1.png';
import streakCalendar from '@/assets/dashboard/streak-calendar-pixel-v1.png';
import missionRibbon from '@/assets/dashboard/mission-ribbon-pixel-v1.png';

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface AdventureHeroProps {
  user: CurrentUser | null;
  stats: DashboardStats | null;
  streak: WeeklyStreak | null;
  currentModule?: JourneyNodeData;
  onContinue: () => void;
}

export function AdventureHero({ user, stats, streak, currentModule, onContinue }: AdventureHeroProps) {
  const totalPoints = stats?.totalPoints ?? 0;
  const levelTarget = totalPoints + (stats?.xpToNextLevel ?? 0);
  const xpPercent = levelTarget ? Math.round((totalPoints / levelTarget) * 100) : 0;
  const moduleProgress = currentModule?.progress ?? 0;
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Agente';
  const checkedDays = streak?.checkedDays ?? weekDays.map(() => false);

  return (
    <section className="hall-hero-grid" aria-label="Resumo da aventura">
      <article className="hall-mission-card" aria-labelledby="hall-hero-title">
        <div className="hall-mission-copy">
          <div className="hall-ribbon">
            <img src={missionRibbon} alt="" aria-hidden="true" />
            <span>Continue sua aventura</span>
          </div>
          <p className="hall-hero-greeting">Olá, {firstName}!</p>
          <h1 id="hall-hero-title">{currentModule?.title ?? 'Sua próxima missão espera por você'}</h1>
          <p className="hall-lesson-line">
            <BookOpen size={16} aria-hidden="true" />
            {currentModule
              ? `Aula ${Math.min(currentModule.completedAulas + 1, Math.max(currentModule.totalAulas, 1))} de ${currentModule.totalAulas}`
              : 'Escolha sua primeira missão'}
          </p>
          <div className="hall-mission-progress-row">
            <div className="hall-progress-track" role="progressbar" aria-label="Progresso do módulo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={moduleProgress}>
              <i style={{ width: `${moduleProgress}%` }} />
            </div>
            <strong>{moduleProgress}%</strong>
          </div>
          <div className="hall-mission-actions">
            <span className="hall-reward"><Star size={20} /><small>Recompensa</small><strong>+{currentModule?.xpBonus || 50} XP</strong></span>
            <AppButton className="hall-hero-cta" icon={<Play size={16} />} onClick={onContinue}>Continuar missão</AppButton>
          </div>
        </div>
        <img className="hall-hero-art" src={heroArt} alt="" aria-hidden="true" />
      </article>

      <aside className="hall-player-card" aria-label="Nível e sequência semanal">
        <span className="hall-pixel-corner" aria-hidden="true" />
        <div className="hall-level-row">
          <div className="hall-level-asset">
            <img src={levelShield} alt="" aria-hidden="true" />
            <strong>{stats?.level ?? '—'}</strong>
          </div>
          <div className="hall-level-copy">
            <h2>Nível {stats?.level ?? '—'}</h2>
            <div><Star size={19} /><strong>{totalPoints.toLocaleString('pt-BR')}</strong><span>/ {levelTarget.toLocaleString('pt-BR')} XP</span></div>
            <div className="hall-progress-track" role="progressbar" aria-label="Progresso de experiência" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpPercent}><i style={{ width: `${xpPercent}%` }} /></div>
          </div>
        </div>
        <div className="hall-player-separator" />
        <div className="hall-streak-summary">
          <img src={streakCalendar} alt="" aria-hidden="true" />
          <div><strong>Sequência: {streak?.streak ?? 0} {(streak?.streak ?? 0) === 1 ? 'dia' : 'dias'}</strong><span>Continue assim!</span></div>
        </div>
        <div className="hall-week-row" role="list" aria-label="Sequência desta semana">
          {weekDays.map((day, index) => {
            const checked = checkedDays[index];
            const today = index === streak?.todayIndex;
            return <span key={day} role="listitem" className={`${checked ? 'is-checked' : ''} ${today ? 'is-today' : ''}`}><i>{checked ? <Check size={14} strokeWidth={3} /> : null}</i><small>{day}</small></span>;
          })}
        </div>
      </aside>
    </section>
  );
}
