import { ContentLoading } from '@/components/shared/ContentLoading';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
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
import { NEXT_LABEL, lessonNextAction, pagedStepItems, readerPercent } from './lessonStepItems';
import { useLessonStepFocus } from './lessonFocus';
import { ProgressSaveStatus } from './ProgressSaveStatus';

interface AulaQuadrinhoProps {
  aulaId: number;
  moduloId: number;
  onBack: () => void;
  onSelectAula: (aulaId: number) => void;
}

export function AulaQuadrinho({ aulaId, moduloId, onBack, onSelectAula }: AulaQuadrinhoProps) {
  const { aula, setAula, loading, error: aulaError, errorKind, refetch } = useAula(aulaId);
  const { modulo, refetch: refetchModulo } = useModulo(moduloId);
  const { concluir, salvarProgresso, retryProgress, saveStatus, loading: concluding, error: progressError } = useAulaProgress();
  const [showQuiz, setShowQuiz] = useState(false);
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const [furthest, setFurthest] = useState(0);
  const [brokenPages, setBrokenPages] = useState<number[]>([]);
  const restored = useRef(false);

  const pages = aula?.pages?.filter((page) => typeof page === 'string' && page.trim() !== '') ?? [];
  const hasQuiz = (aula?.quiz?.length ?? 0) > 0;
  const completed = aula?.completed ?? false;
  const openQuiz = useCallback(() => setShowQuiz(true), []);
  const { currentPage, isLastPage, goNext, goPrev, goTo, handleTouchStart, handleTouchEnd } =
    usePageNavigation({
      totalPages: pages.length,
      enabled: !showQuiz,
      onLastPage: hasQuiz && !completed ? openQuiz : undefined,
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
    if (!aula || !restored.current || showQuiz || aula.completed) return;
    const timer = window.setTimeout(() => {
      const percent = pages.length ? Math.min(99, Math.round(((currentPage + 1) / pages.length) * 100)) : 0;
      void salvarProgresso(aula.id, { progress_percent: percent, last_page: currentPage });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [aula?.id, aula?.completed, currentPage, pages.length, salvarProgresso, showQuiz]);

  const markCompleted = () => {
    setAula((previous) => previous ? { ...previous, completed: true, progress: { ...previous.progress, percent: 100 } } : previous);
    void refetchModulo();
  };

  const handleCompleteWithoutQuiz = async () => {
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
  const goToPage = (index: number) => { setShowQuiz(false); goTo(index); };
  const steps = pagedStepItems({
    labels: pages.map((_, index) => `Página ${index + 1}`),
    currentPage, showQuiz, completed: aula.completed, hasQuiz, quizReachable, onPage: goToPage, onQuiz: openQuiz, withDone: true,
  });

  const action = lessonNextAction(!pages.length || Boolean(isLastPage), hasQuiz, aula.completed);
  const nextLabel = concluding ? 'Registrando...' : action === 'next' ? 'Próxima página' : NEXT_LABEL[action];
  const handleNext = action === 'leave' ? onBack : action === 'complete' ? () => void handleCompleteWithoutQuiz() : goNext;
  const page = pages[currentPage];
  const pageBroken = brokenPages.includes(currentPage);

  return (
    <LearningShell
      aulaId={aulaId}
      title={aula.title}
      type="quadrinho"
      xp={aula.xp}
      duration={aula.duration}
      sizeLabel={pages.length ? `${pages.length} ${pages.length === 1 ? 'página' : 'páginas'}${hasQuiz ? ' + quiz' : ''}` : null}
      modulo={modulo}
      onBack={onBack}
      progress={showQuiz ? 100 : readerProgress}
      progressLabel={showQuiz ? 'Leitura concluída · quiz em andamento' : pages.length ? `Página ${currentPage + 1} de ${pages.length}` : 'Sem páginas publicadas'}
      steps={<LessonStepper steps={steps} />}
      aside={<LessonNavigator modulo={modulo} activeAulaId={aulaId} onSelectAula={onSelectAula} />}
      footer={!showQuiz ? <>
        {progressError && <p className="lesson-error" role="alert">{progressError}</p>}
        <ProgressSaveStatus status={saveStatus} onRetry={retryProgress} />
      </> : undefined}
    >
      <section className="lesson-pane" aria-label={showQuiz ? 'Quiz da aula' : pages.length ? `Quadrinho, página ${currentPage + 1} de ${pages.length}` : 'Quadrinho'}>
        {showQuiz ? (
          <AulaQuiz aula={aula} onBack={() => goToPage(pages.length - 1)} onComplete={onBack} onReread={() => goToPage(0)} onResult={markCompleted} />
        ) : <>
          <h2 ref={headingRef} tabIndex={-1} className="lesson-sr">{pages.length ? `Página ${currentPage + 1} de ${pages.length}` : 'Quadrinho'}</h2>
          <div className="lesson-comic" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {page && !pageBroken ? (
              <img
                key={`${aulaId}-${currentPage}`}
                className="lesson-enter"
                src={page}
                alt={`Página ${currentPage + 1} do quadrinho ${aula.title}`}
                draggable={false}
                onError={() => setBrokenPages((list) => list.includes(currentPage) ? list : [...list, currentPage])}
              />
            ) : (
              <div className="lesson-comic-empty" role="status">
                <BookOpen size={38} aria-hidden="true" />
                <strong>{page ? 'Página indisponível' : 'Quadrinho indisponível'}</strong>
                <span>{page ? 'Não foi possível carregar esta imagem.' : 'Esta aula ainda não possui páginas publicadas.'}</span>
              </div>
            )}
          </div>

          {xpGanho !== null && (
            <LessonCheckpoint variant="compact" title="Checkpoint! Leitura concluída" xp={xpGanho}
              actions={<AppButton variant="chunky" tone="blue" icon={<ArrowRight size={18} aria-hidden="true" />} onClick={onBack}>Seguir na trilha</AppButton>} />
          )}

          <nav className="lesson-nav" aria-label="Navegação do quadrinho">
            <AppButton variant="chunky" tone="ghost" size="sm" onClick={goPrev} disabled={currentPage === 0}>Página anterior</AppButton>
            <span aria-live="polite">{pages.length ? `Página ${currentPage + 1} de ${pages.length}` : 'Sem páginas'}</span>
            {xpGanho === null && (
              <AppButton variant="chunky" tone="blue" onClick={handleNext} disabled={concluding}>{nextLabel}</AppButton>
            )}
          </nav>
          {aula.description && <div className="lesson-brief"><strong>Contexto da aula</strong>{aula.description}</div>}
        </>}
      </section>
    </LearningShell>
  );
}
