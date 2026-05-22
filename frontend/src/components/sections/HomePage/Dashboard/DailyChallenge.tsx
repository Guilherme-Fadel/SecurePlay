import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Calendar, Target, Clock, Trophy, BadgeCheck } from 'lucide-react';
import { useDailyChallenge } from '@/hooks/useDashboard';
import { Modal } from '@/components/ui/modal';
import { QuizContent } from '@/components/sections/Quiz/QuizContent';
import { useState, useEffect, useCallback } from 'react';
import { getChallengeStatus } from '@/services/challenge';
import { getCached, setCache } from '@/lib/queryCache';

export function DailyChallenge() {
  const { challenge, loading } = useDailyChallenge();
  const [open, setOpen] = useState(false);

  const cacheKey = challenge ? `challenge-status:${challenge.id}` : null;
  const cachedCompleted = cacheKey ? getCached<boolean>(cacheKey) : null;

  const [completed, setCompleted] = useState(cachedCompleted ?? false);
  const [checkingStatus, setCheckingStatus] = useState(cachedCompleted === null);

  useEffect(() => {
    if (!challenge || !cacheKey) {
      setCheckingStatus(false);
      return;
    }

    const cached = getCached<boolean>(cacheKey);
    if (cached !== null) {
      setCompleted(cached);
      setCheckingStatus(false);
      return;
    }

    getChallengeStatus(challenge.id)
      .then((status) => {
        setCompleted(status.completed);
        setCache(cacheKey, status.completed);
      })
      .catch(() => setCompleted(false))
      .finally(() => setCheckingStatus(false));
  }, [challenge, cacheKey]);

  const handleComplete = () => {
    setOpen(false);
    setCompleted(true);
    if (cacheKey) setCache(cacheKey, true);
  };

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
        <button
          onClick={() => setOpen(true)}
          disabled={completed || checkingStatus}
          className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
            completed
              ? 'bg-[var(--surface-alt)] text-[var(--text-secondary)] cursor-not-allowed opacity-60'
              : 'bg-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)]'
          }`}
        >
          {completed ? 'Desafio Concluído' : 'Iniciar Desafio'}
        </button>
      </InfoCard.Footer>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={challenge.title}
      >
        <QuizContent
          challengeId={challenge.id}
          onComplete={handleComplete}
        />
      </Modal>
    </InfoCard>
  );
}
