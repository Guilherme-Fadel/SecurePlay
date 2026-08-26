import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Trophy, Crown } from 'lucide-react';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { useSectionContext } from '@/contexts/SectionContext';
import type { RankingEntry } from '@/services/dashboard';

export function RankingWidget() {
  const { ranking, loading } = useDashboardRanking();
  const { setActiveSection } = useSectionContext();

  if (loading || !ranking) {
    return (
      <InfoCard variant="accent" raised className="flex flex-col animate-pulse">
        <div className="p-4 h-64" />
      </InfoCard>
    );
  }

  const top3 = ranking.top.slice(0, 3);
  const rest = ranking.top.slice(3);
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <InfoCard variant="accent" raised className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg border bg-[var(--accent-15)] border-[var(--accent-30)] shrink-0 text-[var(--accent)]">
            <Trophy size={16} />
          </div>
          <div>
            <span className="text-[var(--text-primary)] text-base leading-tight font-[var(--font-family-base)]">RANKING</span>
          </div>
        </div>
        <button
          onClick={() => setActiveSection('ranking')}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
        >
          Ver tudo
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3 lg:flex-1 lg:min-h-0">
        <div className="flex items-end justify-center gap-2">
          {podium.map((entry) => (
            <PodiumColumn key={entry.position} entry={entry} />
          ))}
        </div>

        <div className="scrollbar-thin flex-1 min-h-0 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-alt)]/40 divide-y divide-[var(--border)]">
          {rest.map((entry) => (
            <RankRow key={entry.position} entry={entry} />
          ))}
        </div>

        <div className="shrink-0">
          <div className="text-[10px] tracking-widest text-[var(--text-secondary)] mb-1 px-1">
            SUA POSIÇÃO
          </div>
          <RankRow entry={ranking.currentUser} highlight />
        </div>
      </div>
    </InfoCard>
  );
}

const podiumHeight: Record<number, string> = {
  1: 'h-11',
  2: 'h-8',
  3: 'h-6',
};

function PodiumColumn({ entry }: { entry: RankingEntry }) {
  const isFirst = entry.position === 1;
  return (
    <div className="flex flex-col items-center gap-1 w-1/3">
      <div className="relative">
        {isFirst && (
          <Crown
            size={14}
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[var(--accent)] fill-[var(--accent)]"
          />
        )}
        <div className="w-9 h-9 rounded-full border-2 border-[var(--border)] bg-[var(--surface-alt)] flex items-center justify-center">
          <span className="text-[var(--text-primary)] font-[var(--font-family-base)]">
            {entry.name.charAt(0)}
          </span>
        </div>
      </div>

      <span className="text-[var(--text-primary)] text-[11px] font-medium truncate max-w-full text-center leading-tight">
        {entry.name}
      </span>
      <span className="text-[var(--text-secondary)] text-[10px] leading-none">
        {entry.points.toLocaleString('pt-BR')}
      </span>

      <div
        className={`w-full ${podiumHeight[entry.position]} rounded-t-md bg-gradient-to-b from-[var(--surface-alt)] to-[var(--surface)] border border-b-0 border-[var(--border)] flex items-center justify-center`}
      >
        <span className="text-[var(--text-secondary)] font-[var(--font-family-base)]">
          {entry.position}
        </span>
      </div>
    </div>
  );
}

function RankRow({ entry, highlight }: { entry: RankingEntry; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg ${
        highlight ? 'bg-[var(--accent-15)] border border-[var(--accent-30)]' : ''
      }`}
    >
      <span className="w-5 text-center text-[var(--text-secondary)] text-sm font-[var(--font-family-base)]">
        {entry.position}
      </span>
      <div className="w-6 h-6 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] flex items-center justify-center shrink-0">
        <span className="text-[var(--text-primary)] text-xs font-[var(--font-family-base)]">
          {entry.name.charAt(0)}
        </span>
      </div>
      <span className="flex-1 text-[var(--text-primary)] text-sm truncate">
        {entry.name}
      </span>
      <span className="text-[var(--text-secondary)] text-[11px] shrink-0">
        Nv {entry.level}
      </span>
      <span className="text-[var(--text-primary)] text-sm font-semibold shrink-0 w-16 text-right">
        {entry.points.toLocaleString('pt-BR')}
      </span>
    </div>
  );
}
