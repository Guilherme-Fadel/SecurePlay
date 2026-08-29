import { Play } from 'lucide-react';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useDailyChallenge } from '@/hooks/useDashboard';
import { Modal } from '@/components/ui/modal';
import { QuizContent } from '@/components/sections/Quiz/QuizContent';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { getChallengeStatus, getChallengeQuestions, QuestionResponse } from '@/services/challenge';
import { getCached, setCache } from '@/lib/queryCache';

const difficultyMeta = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
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

  const difficultyLabel = difficultyMeta[challenge.difficulty];

  const totalObjectives = questions.length;
  const doneObjectives = completed ? totalObjectives : Math.min(answeredCount, totalObjectives);
  const progressPercent = totalObjectives > 0 ? Math.round((doneObjectives / totalObjectives) * 100) : (completed ? 100 : 0);

  return (
    <InfoCard variant="primary" raised className="dashboard-daily-card flex flex-col h-full min-h-0">
      <div className="dashboard-daily-body flex-1 min-h-0 flex flex-col gap-2 p-2.5 overflow-hidden">
        <div className="dashboard-daily-summary shrink-0">
          <h3>{challenge.title}</h3>
        </div>

        <div className="dashboard-daily-meta">
          <div><span>Dificuldade</span><strong>{difficultyLabel}</strong></div>
          <div><span>Tempo estimado</span><strong>{challenge.duration} min</strong></div>
          <div><span>Recompensa</span><strong>{challenge.points} XP</strong></div>
        </div>

        <div className="dashboard-challenge-briefing">
          <span>Briefing da missão</span>
          <p>{challenge.description}</p>
        </div>

        {totalObjectives > 0 && (
          <div className="dashboard-daily-progress-wrap flex flex-col gap-1 shrink-0">
            <div className="flex items-center justify-between text-[10px] tracking-widest text-[var(--text-secondary)]">
              <span>PROGRESSO</span>
              <span className="text-[var(--text-primary)] font-semibold">{doneObjectives}/{totalObjectives}</span>
            </div>
            <div className="dashboard-daily-progress h-2 rounded-full bg-[var(--surface-alt)] border border-[var(--border)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--primary)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

      </div>

      <InfoCard.Footer className="flex justify-center">
        <motion.button
          onClick={() => setOpen(true)}
          disabled={!canStart}
          whileHover={canStart ? { scale: 1.01 } : undefined}
          whileTap={canStart ? { scale: 0.98 } : undefined}
          className={`app-button app-button--primary app-button--md dashboard-primary-button w-full ${
            completed
              ? 'is-completed'
              : ''
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
