import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Calendar, Target, Clock, Trophy } from 'lucide-react';
import { useDailyChallenge } from '@/hooks/useDashboard';

export function DailyChallenge() {
  const { challenge, loading } = useDailyChallenge();

  if (loading) {
    return (
      <InfoCard variant="primary" className="flex flex-col animate-pulse">
        <div className="p-4 h-40" />
      </InfoCard>
    );
  }

  if (!challenge) {
    return (
      <InfoCard variant="primary" className="flex flex-col">
        <InfoCard.Section>
          <p className="text-[var(--text-secondary)]">Nenhum desafio disponível hoje.</p>
        </InfoCard.Section>
      </InfoCard>
    );
  }

  return (
    <InfoCard variant="primary" className="flex flex-col">
      <InfoCard.Header
        title="Desafio do Dia"
        subtitle={`Dificuldade: ${challenge.difficulty}`}
        icon={Calendar}
        variant="primary"
      />

      <InfoCard.Section className="flex-1 flex flex-col gap-3">
        <InfoCard.Stat
          label="Objetivo"
          value={challenge.title}
          subtitle={challenge.description}
          icon={Target}
          variant="secondary"
        />

        <InfoCard.Item
          label="Duração"
          value={`${challenge.duration} minutos`}
          icon={Clock}
          variant="primary"
        />

        <InfoCard.Item
          label="Recompensa"
          value={`+${challenge.points} XP`}
          icon={Trophy}
          variant="accent"
        />
      </InfoCard.Section>

      <InfoCard.Footer className="flex justify-center">
        <button className="w-full px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)] transition-colors font-semibold">
          Iniciar Desafio
        </button>
      </InfoCard.Footer>
    </InfoCard>
  );
}
