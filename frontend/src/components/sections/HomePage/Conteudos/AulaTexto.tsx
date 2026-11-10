import { ContentLoading } from '@/components/shared/ContentLoading';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useAula } from '@/hooks/useAula';
import { useAulaProgress } from '@/hooks/useAulaProgress';
import { useModulo } from '@/hooks/useModulo';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { AulaQuiz } from './AulaQuiz';
import { LearningShell } from './LearningShell';
import { LessonCheckpoint } from './LessonCheckpoint';
import { LessonNavigator } from './LessonNavigator';
import { LessonState } from './LessonState';
import { LessonStepper } from './LessonStepper';
import { LessonTextStep } from './LessonTextStep';
import { useLessonStepFocus } from './lessonFocus';
import { buildLessonSteps } from './lessonSteps';
import { NEXT_LABEL, lessonNextAction, pagedStepItems, readerPercent } from './lessonStepItems';
import { ProgressSaveStatus } from './ProgressSaveStatus';
import { useCanonicalLearnPath } from './useCanonicalLearnPath';

interface AulaTextoProps {
  aulaId: number;
  moduloId: number;
  onBack: () => void;
  onSelectAula: (aulaId: number) => void;
}

export function AulaTexto({ aulaId, moduloId, onBack, onSelectAula }: AulaTextoProps) {
  const { aula, setAula, loading, error: aulaError, errorKind, refetch } = useAula(aulaId);
  const { modulo, refetch: refetchModulo } = useModulo(moduloId);
  useCanonicalLearnPath(modulo, aula && { id: aula.id, title: aula.title, moduloId: aula.modulo_id });
  const { concluir, salvarProgresso, retryProgress, saveStatus, loading: concluding, error: progressError } = useAulaProgress();
  const [showQuiz, setShowQuiz] = useState(false);
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const [furthest, setFurthest] = useState(0);
  const restored = useRef(false);
  const pages = aula?.pages ?? [];
  const lesson = useMemo(() => buildLessonSteps(aula?.pages), [aula?.pages]);
  const hasQuiz = (aula?.quiz?.length ?? 0) > 0;
  const openQuiz = useCallback(() => setShowQuiz(true), []);
  const { currentPage, isLastPage, goNext, goPrev, goTo } = usePageNavigation({
    totalPages: pages.length,
    enabled: !showQuiz,
    onLastPage: hasQuiz && !aula?.completed ? openQuiz : undefined,
  });
  const { headingRef, arm } = useLessonStepFocus(showQuiz ? 'quiz' : currentPage);

  useEffect(() => {
    if (!aula || restored.current) return;
    restored.current = true;
    const target = Math.min(aula.progress.lastPage, Math.max(0, pages.length - 1));
    arm(target === currentPage ? null : target);
    goTo(target);
  }, [aula?.id, pages.length, goTo]);

  useEffect(() => {
    setFurthest((value) => Math.max(value, currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (!aula || !restored.current || showQuiz || aula.completed || !pages.length) return;
    const timer = window.setTimeout(() => {
      const percent = Math.min(99, Math.round(((currentPage + 1) / pages.length) * 100));
      void salvarProgresso(aula.id, { progress_percent: percent, last_page: currentPage });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [aula?.id, aula?.completed, currentPage, pages.length, salvarProgresso, showQuiz]);

  const markCompleted = () => {
    setAula((previous) => previous ? { ...previous, completed: true, progress: { ...previous.progress, percent: 100 } } : previous);
    void refetchModulo();
  };

  const handleComplete = async () => {
    const result = await concluir(aulaId);
    if (!result) return;
    setXpGanho(result.xp_ganho);
    markCompleted();
  };

  if (loading || !aula) {
    if (!aulaError) return <ContentLoading variant="reader" />;
    return <LessonState message={aulaError} kind={errorKind} onRetry={refetch} onBack={onBack} />;
  }

  const readerProgress = readerPercent(aula.completed, currentPage, pages.length);
  const quizReachable = hasQuiz && !aula.completed && furthest >= pages.length - 1;
  const goToStep = (index: number) => { setShowQuiz(false); goTo(index); };
  const steps = pagedStepItems({
    labels: lesson.steps.map((item) => item.label),
    currentPage, showQuiz, completed: aula.completed, hasQuiz, quizReachable, onPage: goToStep, onQuiz: openQuiz,
  });

  const step = lesson.steps[currentPage];
  const stepCount = `${lesson.steps.length} ${lesson.structured ? 'etapas' : lesson.steps.length === 1 ? 'página' : 'páginas'}`;
  const action = lessonNextAction(isLastPage, hasQuiz, aula.completed);
  const nextLabel = concluding ? 'Registrando...' : NEXT_LABEL[action];
  const handleNext = action === 'leave' ? onBack : action === 'complete' ? () => void handleComplete() : goNext;

  return (
    <LearningShell
      aulaId={aulaId}
      title={aula.title}
      type="texto"
      xp={aula.xp}
      duration={aula.duration}
      sizeLabel={pages.length ? `${stepCount}${hasQuiz ? ' + quiz' : ''}` : null}
      modulo={modulo}
      onBack={onBack}
      progress={showQuiz ? 100 : readerProgress}
      progressLabel={showQuiz ? 'Leitura concluída · quiz em andamento' : pages.length ? `Etapa ${currentPage + 1} de ${pages.length}` : 'Sem páginas publicadas'}
      steps={<LessonStepper steps={steps} />}
      aside={<LessonNavigator modulo={modulo} activeAulaId={aulaId} onSelectAula={onSelectAula} />}
      footer={!showQuiz ? <>
        {progressError && <p className="lesson-error" role="alert">{progressError}</p>}
        <ProgressSaveStatus status={saveStatus} onRetry={retryProgress} />
      </> : undefined}
    >
      <section className="lesson-pane" aria-label={showQuiz ? 'Quiz da aula' : step ? `Etapa ${currentPage + 1} de ${pages.length}` : 'Leitura'}>
        {showQuiz ? (
          <AulaQuiz
            aula={aula}
            onBack={() => goToStep(pages.length - 1)}
            onComplete={onBack}
            onReread={() => goToStep(0)}
            onResult={markCompleted}
          />
        ) : <>
          {step
            ? <LessonTextStep key={`${aulaId}-${currentPage}`} step={step} index={currentPage} headingRef={headingRef} />
            : <div className="lesson-page"><p className="lesson-empty" role="status"><strong>Conteúdo de leitura indisponível.</strong> Esta aula ainda não possui páginas publicadas.</p></div>}

          {xpGanho !== null && (
            <LessonCheckpoint variant="compact" title="Checkpoint! Leitura concluída" xp={xpGanho}
              actions={<AppButton variant="chunky" tone="blue" icon={<ArrowRight size={18} aria-hidden="true" />} onClick={onBack}>Seguir na trilha</AppButton>} />
          )}

          {(pages.length > 0 || hasQuiz) && (
            <nav className="lesson-nav" aria-label="Navegação da aula">
              <AppButton variant="chunky" tone="ghost" size="sm" onClick={goPrev} disabled={currentPage === 0}>Voltar</AppButton>
              <span aria-live="polite">{pages.length ? `Etapa ${currentPage + 1} de ${pages.length}` : 'Sem páginas'}</span>
              {xpGanho === null && (
                <AppButton variant="chunky" tone="blue" onClick={handleNext} disabled={concluding}>
                  {nextLabel}
                </AppButton>
              )}
            </nav>
          )}
        </>}
      </section>
    </LearningShell>
  );
}
