import { AppButton } from '@/components/ui/buttons/AppButton';
import { useDailyChallenge } from '@/hooks/useDashboard';
import { Modal } from '@/components/ui/modal';
import { QuizContent } from '@/components/sections/Quiz/QuizContent';
import { useState, useEffect, useRef } from 'react';
import { getChallengeStatus, getChallengeQuestions, QuestionResponse } from '@/services/challenge';
import { getCached, setCache } from '@/lib/queryCache';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
import { CircleCheck } from 'lucide-react';

export function DailyChallenge() {
  const { challenge, loading } = useDailyChallenge();
  const [open, setOpen] = useState(false);
  // Ao concluir, o botão que abriu vira o aviso "Feita hoje": o foco volta ao título do bloco.
  const titleRef = useRef<HTMLHeadingElement>(null);

  const cacheKey = challenge ? `challenge-status:${challenge.id}` : null;
  const cachedCompleted = cacheKey ? getCached<boolean>(cacheKey) : null;

  const [completed, setCompleted] = useState(cachedCompleted ?? false);
  const [checkingStatus, setCheckingStatus] = useState(cachedCompleted === null);
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);

  useEffect(() => {
    setOpen(false);
    setCompleted(false);
    setCheckingStatus(true);
    setAnsweredCount(0);
    setQuestions([]);
  }, [challenge?.id]);

  useEffect(() => {
    if (!challenge) return;
    let cancelled = false;
    const questionsCacheKey = `challenge-questions:${challenge.id}`;
    const cachedQuestions = getCached<QuestionResponse[]>(questionsCacheKey);
    if (cachedQuestions) {
      setQuestions(cachedQuestions);
      return;
    }
    getChallengeQuestions(challenge.id)
      .then((data) => {
        if (cancelled) return;
        setQuestions(data.questions);
        setCache(questionsCacheKey, data.questions);
      })
      .catch(() => { if (!cancelled) setQuestions([]); });
    return () => { cancelled = true; };
  }, [challenge]);

  useEffect(() => {
    if (!challenge || !cacheKey) {
      setCheckingStatus(false);
      return;
    }

    let cancelled = false;
    getChallengeStatus(challenge.id)
      .then((status) => {
        if (cancelled) return;
        setCompleted(status.completed);
        setAnsweredCount(status.answeredCount);
        setCache(cacheKey, status.completed);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCheckingStatus(false); });
    return () => { cancelled = true; };
  }, [challenge, cacheKey]);

  const canStart = !!challenge && !completed && !checkingStatus;

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
    return <section className="hv-card hv-daily is-loading" aria-busy="true" aria-label="Carregando a missão do dia"><span className="hv-skeleton is-title" /><span className="hv-skeleton" /></section>;
  }

  if (!challenge) {
    return (
      <section className="hv-card hv-daily" aria-labelledby="hv-daily-title">
        <div><p className="hv-eyebrow">Vale o check-in de hoje</p><h2 id="hv-daily-title" className="hv-display">Missão do dia</h2></div>
        <p className="hv-muted">Nenhuma missão disponível hoje. Volte amanhã!</p>
      </section>
    );
  }

  const totalObjectives = questions.length;
  const doneObjectives = completed ? totalObjectives : Math.min(answeredCount, totalObjectives);
  const details = [
    totalObjectives > 0 ? `${totalObjectives} ${totalObjectives === 1 ? 'pergunta' : 'perguntas'}` : null,
    challenge.duration > 0 ? `cerca de ${challenge.duration} min` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <section className="hv-card hv-daily" aria-labelledby="hv-daily-title">
        <div><p className="hv-eyebrow">Vale o check-in de hoje</p><h2 id="hv-daily-title" ref={titleRef} tabIndex={-1} className="hv-display">Missão do dia</h2></div>
        <div className="hv-daily-row">
          <span className="hv-daily-art" aria-hidden="true">
            <img src={getChallengeArtwork(challenge.image, 'caca-phishing')} alt="" width={56} height={56} onError={(event) => {
              const fallback = getChallengeArtwork(null, 'caca-phishing');
              if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
            }} />
          </span>
          <div>
            <strong>{challenge.title}</strong>
            {details && <small>{details}</small>}
          </div>
        </div>
        {completed ? (
          <span className="hv-done" role="status"><CircleCheck size={18} aria-hidden="true" /> Feita hoje · check-in feito</span>
        ) : (
          <>
            {doneObjectives > 0 && totalObjectives > 0 && (
              <p className="hv-muted">{doneObjectives === totalObjectives ? 'Refaça o quiz para concluir o envio.' : `${doneObjectives} de ${totalObjectives} respostas corretas.`}</p>
            )}
            <AppButton
              variant="chunky"
              tone="yellow"
              size="md"
              className="hv-daily-cta"
              disabled={!canStart}
              aria-label={`${doneObjectives > 0 ? 'Refazer' : 'Fazer'} missão do dia: ${challenge.title}`}
              onClick={() => setOpen(true)}
            >
              {doneObjectives > 0 ? 'Refazer a missão' : 'Fazer a missão'}
            </AppButton>
          </>
        )}
      </section>
      <Modal
        open={open}
        onClose={handleCloseModal}
        returnFocusRef={titleRef}
        title={challenge.title}
      >
        <QuizContent
          challengeId={challenge.id}
          onComplete={handleComplete}
          onClose={handleCloseModal}
        />
      </Modal>
    </>
  );
}
