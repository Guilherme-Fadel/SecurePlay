import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useDailyChallenge } from '@/hooks/useDashboard';
import { Modal } from '@/components/ui/modal';
import { QuizContent } from '@/components/sections/Quiz/QuizContent';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { getChallengeStatus, getChallengeQuestions, QuestionResponse } from '@/services/challenge';
import { getCached, setCache } from '@/lib/queryCache';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
import { Sparkles } from 'lucide-react';

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

  const totalObjectives = questions.length;
  const doneObjectives = completed ? totalObjectives : Math.min(answeredCount, totalObjectives);
  const progressPercent = totalObjectives > 0 ? Math.round((doneObjectives / totalObjectives) * 100) : (completed ? 100 : 0);

  return (
    <InfoCard variant="primary" raised className="dashboard-daily-card flex flex-col h-full min-h-0">
      <div className="dashboard-daily-body flex-1 min-h-0 flex flex-col gap-2 p-2.5 overflow-hidden">
        <span className="academy-daily-sparkles" aria-hidden="true"><Sparkles /><i /><i /></span>
        <img className="academy-daily-illustration" src={getChallengeArtwork(challenge.image, 'caca-phishing')} alt="" aria-hidden="true" onError={(event) => {
          const fallback = getChallengeArtwork(null, 'caca-phishing');
          if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
        }} />
        <div className="dashboard-daily-summary shrink-0">
          <h3>{challenge.title}</h3>
          <p>Complete hoje e mantenha sua aventura em movimento.</p>
        </div>
        {doneObjectives > 0 && totalObjectives > 0 && (
          <div className="academy-mission-completion">
            <small>{doneObjectives} de {totalObjectives} etapas</small>
            <div className="academy-mission-completion-track" role="progressbar" aria-label="Etapas da missão" aria-valuemin={0} aria-valuemax={totalObjectives} aria-valuenow={doneObjectives}>
              <motion.div
                className="academy-mission-completion-fill"
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
          <span>{completed ? 'Missão concluída' : doneObjectives > 0 ? 'Continuar missão' : 'Iniciar missão'}</span>
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
