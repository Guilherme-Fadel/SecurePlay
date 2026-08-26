import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Flame } from 'lucide-react';
import { useWeeklyStreak } from '@/hooks/useDashboard';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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

  return (
    <InfoCard variant="primary" raised className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg border bg-[var(--accent-15)] border-[var(--accent-30)] shrink-0 text-[var(--accent)]">
          <Flame size={16} />
        </div>
        <div className="flex flex-1 items-center justify-between gap-2">
          <span className="text-[var(--text-primary)] text-base leading-tight font-[var(--font-family-base)]">Sequência Semanal</span>
          <span className="text-[var(--text-secondary)] text-base leading-tight font-[var(--font-family-base)] shrink-0">
            {streakCount} {streakCount === 1 ? 'dia' : 'dias'}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2 px-4 py-2.5">
        <div className="flex items-center justify-between w-full gap-1">
          {DAYS.map((day, index) => {
            const isChecked = checkedDays[index];
            return (
              <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-full aspect-square max-w-9 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                    isChecked
                      ? 'bg-[var(--success-20)] border-[var(--success)] text-[var(--success)]'
                      : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >
                  <Flame size={14} />
                </div>
                <span className={`text-[9px] font-medium ${
                  isChecked ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>

        {checkinMessage && (
          <p className="text-sm text-center text-[var(--success)]">{checkinMessage}</p>
        )}
      </div>

      <InfoCard.Footer className="flex justify-center">
        <button
          onClick={doCheckin}
          disabled={checkedToday || checkinLoading}
          className={`w-full inline-flex items-center justify-center h-10 px-4 rounded-md border text-[13px] font-semibold transition-all active:scale-[0.98] ${
            checkedToday
              ? 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-secondary)] cursor-not-allowed'
              : 'bg-[var(--primary)] border-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)] shadow-[0_3px_12px_rgba(0,0,0,0.25)]'
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
