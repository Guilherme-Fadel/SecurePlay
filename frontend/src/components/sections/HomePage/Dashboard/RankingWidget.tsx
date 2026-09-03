import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Trophy } from 'lucide-react';
import { useDashboardRanking } from '@/hooks/useDashboard';
import { Avatar } from '@/components/ui/visuals/Avatar';
import type { RankingEntry } from '@/services/dashboard';
import { useSectionContext } from '@/contexts/SectionContext';
import { AppButton } from '@/components/ui/buttons/AppButton';

export function RankingWidget() {
  const { ranking, loading } = useDashboardRanking();
  const { navigateToSection } = useSectionContext();

  if (loading || !ranking) {
    return (
      <InfoCard variant="accent" raised className="flex flex-col animate-pulse">
        <div className="p-4 h-64" />
      </InfoCard>
    );
  }

  const leaders = ranking.top.slice(0, 4);

  return (
    <InfoCard variant="accent" raised className="dashboard-ranking-card flex flex-col h-full min-h-0 overflow-hidden">
      <div className="dashboard-ranking-body">
        <div className="academy-ranking-list">
          {leaders.map((entry) => (
            <RankingRow key={entry.position} entry={entry} />
          ))}
        </div>
      </div>
      <InfoCard.Footer className="academy-ranking-footer">
        <AppButton variant="secondary" size="sm" onClick={() => navigateToSection('ranking')} icon={<Trophy size={14}/>}>Ver ranking completo</AppButton>
      </InfoCard.Footer>
    </InfoCard>
  );
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  return (
    <div className={`academy-ranking-row rank-${entry.position}`}>
      <span className="academy-ranking-position" aria-label={`${entry.position}º lugar`}>
        {entry.position >= 1 && entry.position <= 3 ? <RankingMedal position={entry.position} /> : entry.position}
      </span>
      <Avatar name={entry.name} imageUrl={entry.profileImageUrl} className="academy-ranking-avatar" />
      <span className="academy-ranking-name">{entry.name}</span>
      <strong>{entry.points.toLocaleString('pt-BR')} XP</strong>
    </div>
  );
}

function RankingMedal({ position }: { position: number }) {
  const palette = position === 1
    ? ['#fff6a0', '#ffd437', '#e39a18', '#9b580d', '#6b371d']
    : position === 2
      ? ['#f4f5ff', '#b9becd', '#848b9d', '#50546a', '#35354c']
      : ['#ffdaa0', '#dd994e', '#b96b32', '#813f24', '#633026'];
  const [light, main, edge, ink, outline] = palette;
  const digit = position === 1
    ? ['010', '110', '010', '010', '111']
    : position === 2
      ? ['111', '001', '111', '100', '111']
      : ['111', '001', '111', '001', '111'];

  return (
    <svg className="academy-ranking-medal" viewBox="0 0 24 32" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M5 18H19V31H17V29H15V27H13V25H11V27H9V29H7V31H5Z" fill="#792636" />
      <path d="M7 19H17V27H15V25H13V23H11V25H9V27H7Z" fill="#d94d55" />
      <path d="M7 19H9V25H7Z" fill="#ff8172" />
      <path d="M8 0H16V2H20V4H22V8H24V16H22V20H20V22H16V24H8V22H4V20H2V16H0V8H2V4H4V2H8Z" fill={outline} />
      <path d="M8 2H16V4H20V8H22V16H20V20H16V22H8V20H4V16H2V8H4V4H8Z" fill={main} />
      <path d="M4 8H6V6H8V4H16V6H8V8H6V16H4Z" fill={light} />
      <path d="M18 8H20V16H18V18H16V20H8V18H16V16H18Z" fill={edge} />
      {digit.flatMap((row, y) => [...row].map((pixel, x) => pixel === '1'
        ? <rect key={`${x}-${y}`} x={9 + x * 2} y={7 + y * 2} width="2" height="2" fill={ink} />
        : null))}
      <path d="M17 3H19V5H21V7H19V9H17V7H15V5H17Z" fill={light} />
    </svg>
  );
}
