import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useWeeklyStreak } from '@/hooks/useDashboard';
import pixelFlame from '@/assets/dashboard/streak-flame-pixel.png';
import { Check, Star } from 'lucide-react';

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function DailyStreak() {
  const { streak, loading, doCheckin, checkinLoading, checkinMessage } = useWeeklyStreak();

  if (loading) {
    return (
      <InfoCard variant="primary" raised className="flex flex-col animate-pulse">
        <div className="p-4 h-40" />
      </InfoCard>
    );
  }

  const checkedDays = streak?.checkedDays ?? [false, false, false, false, false, false, false];
  const streakCount = streak?.streak ?? 0;
  const checkedToday = streak?.checkedToday ?? false;
  const activeDays = checkedDays.filter(Boolean).length;

  return (
    <InfoCard variant="primary" raised className="dashboard-streak-card flex flex-col h-full">
      <div className="academy-streak-body academy-streak-overview">
        <div className="academy-streak-pixels" aria-hidden="true"><i /><i /><i /></div>
        <Star className="academy-streak-star" size={26} aria-hidden="true" />
        <div className="academy-streak-ring">
          <svg viewBox="0 0 120 120" aria-label={`${activeDays} de 7 dias ativos nesta semana`} role="img">
            <circle className="academy-streak-ring-track" cx="60" cy="60" r="54" />
            <circle className="academy-streak-ring-fill" cx="60" cy="60" r="54" pathLength="7" strokeDasharray={`${activeDays} 7`} transform="rotate(-90 60 60)" />
          </svg>
          <div className="academy-streak-ring-content">
            <img src={pixelFlame} alt="" aria-hidden="true" />
            <strong>{streakCount} {streakCount === 1 ? 'dia' : 'dias'}</strong>
            <small>de sequência</small>
          </div>
        </div>
        <div className="academy-streak-week" role="list" aria-label="Check-ins da semana">
          {weekDays.map((day, index) => {
            const isChecked = checkedDays[index];
            const isToday = index === streak?.todayIndex;
            return (
              <div key={day} role="listitem" className={`academy-streak-day ${isChecked ? 'is-checked' : ''} ${isToday ? 'is-today' : ''}`} aria-label={`${day}${isToday ? ', hoje' : ''}: ${isChecked ? 'check-in realizado' : 'sem check-in'}`} aria-current={isToday ? 'date' : undefined}>
                <i aria-hidden="true">{isChecked ? <Check size={15} strokeWidth={3} /> : <b />}</i>
                <small>{day}</small>
              </div>
            );
          })}
        </div>
        <div className="academy-streak-encouragement">
          <strong>{activeDays}/7 dias ativos nesta semana</strong>
          <small>{activeDays === 7 ? 'Semana completa. Muito bem!' : checkedToday ? 'Hoje já conta. Continue amanhã!' : 'Um dia de cada vez. Você consegue!'}</small>
        </div>
        {checkinMessage && (
          <p className="text-sm text-center text-[var(--success)]">{checkinMessage}</p>
        )}
      </div>

      <InfoCard.Footer className="academy-streak-action flex justify-center">
        <button
          onClick={doCheckin}
          disabled={checkedToday || checkinLoading}
          className={`app-button app-button--primary app-button--md dashboard-primary-button w-full ${
            checkedToday
              ? 'is-completed'
              : ''
          }`}
        >
          {checkinLoading
            ? 'Realizando...'
            : checkedToday
              ? 'Check-in realizado'
              : 'Realizar Check-in'}
        </button>
      </InfoCard.Footer>
    </InfoCard>
  );
}
