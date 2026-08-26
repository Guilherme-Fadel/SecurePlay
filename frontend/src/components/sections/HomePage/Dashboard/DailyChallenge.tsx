import { Target, Clock, Trophy, Play, Crosshair } from 'lucide-react';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useDailyChallenge } from '@/hooks/useDashboard';
import { Modal } from '@/components/ui/modal';
import { QuizContent } from '@/components/sections/Quiz/QuizContent';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { getChallengeStatus, getChallengeQuestions, QuestionResponse } from '@/services/challenge';
import { getCached, setCache } from '@/lib/queryCache';

const difficultyMeta = {
  iniciante:     { label: 'INICIANTE',     world: '01', dots: 1, variant: 'accent' as const },
  intermediario: { label: 'INTERMEDIÁRIO', world: '02', dots: 2, variant: 'primary' as const },
  avancado:      { label: 'AVANÇADO',      world: '03', dots: 3, variant: 'secondary' as const },
};

export function DailyChallenge() {
  const { challenge, loading } = useDailyChallenge();
  const [open, setOpen] = useState(false);

  const cacheKey = challenge ? `challenge-status:${challenge.id}` : null;
  const cachedCompleted = cacheKey ? getCached<boolean>(cacheKey) : null;

  const [completed, setCompleted] = useState(cachedCompleted ?? false);
  const [checkingStatus, setCheckingStatus] = useState(cachedCompleted === null);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);

  useEffect(() => {
    if (!challenge) return;
    const questionsCacheKey = `challenge-questions:${challenge.id}`;
    const cachedQuestions = getCached<QuestionResponse[]>(questionsCacheKey);
    if (cachedQuestions) {
      setQuestions(cachedQuestions);
      return;
    }
    getChallengeQuestions(challenge.id)
      .then((data) => {
        setQuestions(data.questions);
        setCache(questionsCacheKey, data.questions);
      })
      .catch(() => setQuestions([]));
  }, [challenge]);

  useEffect(() => {
    if (!challenge || !cacheKey) {
      setCheckingStatus(false);
      return;
    }

    getChallengeStatus(challenge.id)
      .then((status) => {
        setCompleted(status.completed);
        setAnsweredCount(status.answeredCount);
        setCache(cacheKey, status.completed);
      })
      .catch(() => setCompleted(false))
      .finally(() => setCheckingStatus(false));
  }, [challenge, cacheKey]);

  const canStart = !!challenge && !completed && !checkingStatus;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && canStart && !open) {
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canStart, open]);

  const handleComplete = () => {
    setOpen(false);
    setCompleted(true);
    if (cacheKey) setCache(cacheKey, true);
  };

  const handleCloseModal = () => {
    setOpen(false);
    if (!challenge) return;
    getChallengeStatus(challenge.id)
      .then((status) => {
        setCompleted(status.completed);
        setAnsweredCount(status.answeredCount);
        if (cacheKey) setCache(cacheKey, status.completed);
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <InfoCard variant="primary" raised className="flex flex-col animate-pulse">
        <div className="p-4 h-40" />
      </InfoCard>
    );
  }

  if (!challenge) {
    return (
      <InfoCard variant="primary" raised className="flex flex-col">
        <InfoCard.Section>
          <p className="text-[var(--text-secondary)]">Nenhum desafio disponível hoje.</p>
        </InfoCard.Section>
      </InfoCard>
    );
  }

  const meta = difficultyMeta[challenge.difficulty];

  const totalObjectives = questions.length;
  const doneObjectives = completed ? totalObjectives : Math.min(answeredCount, totalObjectives);
  const progressPercent = totalObjectives > 0 ? Math.round((doneObjectives / totalObjectives) * 100) : (completed ? 100 : 0);

  return (
    <InfoCard variant="primary" raised className="flex flex-col h-full min-h-0">

      <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg border bg-[var(--primary-15)] border-[var(--primary-30)] shrink-0 text-[var(--primary)]">
            <Crosshair size={16} />
          </div>
          <div>
            <span className="text-[var(--text-primary)] text-base leading-tight font-[var(--font-family-base)]">DESAFIO DO DIA</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2.5 overflow-hidden">

        <div className="relative rounded-lg border border-[var(--primary-30)] bg-[var(--primary-10)] p-3 shrink-0">
          <div className="absolute top-0 left-0 h-full w-1 rounded-l-lg bg-[var(--primary)]" />
          <span className="text-[var(--text-primary)] text-sm leading-tight font-[var(--font-family-base)] block truncate">{challenge.title}</span>
          <p className="text-[var(--text-secondary)] text-xs mt-0.5 line-clamp-2">{challenge.description}</p>
        </div>

        {totalObjectives > 0 && (
          <div className="flex flex-col gap-1 shrink-0 mt-auto">
            <div className="flex items-center justify-between text-[10px] tracking-widest text-[var(--text-secondary)]">
              <span>PROGRESSO</span>
              <span className="text-[var(--text-primary)] font-semibold">{doneObjectives}/{totalObjectives}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-alt)] border border-[var(--border)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 shrink-0">
          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] py-1.5">
            <Clock size={13} className="text-[var(--primary)]" />
            <span className="text-[var(--text-primary)] font-semibold text-sm">{challenge.duration}m</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--accent-30)] bg-[var(--accent-10)] py-1.5">
            <Trophy size={13} className="text-[var(--accent)]" />
            <span className="text-[var(--text-primary)] font-semibold text-sm">+{challenge.points}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] py-1.5">
            <InfoCard.Dots total={3} active={meta.dots} variant={meta.variant} />
          </div>
        </div>
      </div>

      <InfoCard.Footer className="flex justify-center">
        <motion.button
          onClick={() => setOpen(true)}
          disabled={!canStart}
          whileHover={canStart ? { scale: 1.01 } : undefined}
          whileTap={canStart ? { scale: 0.98 } : undefined}
          className={`w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border text-sm font-semibold transition-all active:scale-[0.98] ${
            completed
              ? 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-secondary)] cursor-not-allowed opacity-60'
              : 'bg-[var(--primary)] border-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)] shadow-[0_0_18px_rgba(var(--primary-rgb),0.35)]'
          }`}
        >
          {!completed && <Play size={13} className="fill-current" />}
          <span className="text-[13px]">{completed ? 'DESAFIO CONCLUÍDO' : doneObjectives > 0 ? 'CONTINUAR MISSÃO' : 'INICIAR DESAFIO'}</span>
        </motion.button>
      </InfoCard.Footer>

      <Modal
        open={open}
        onClose={handleCloseModal}
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
