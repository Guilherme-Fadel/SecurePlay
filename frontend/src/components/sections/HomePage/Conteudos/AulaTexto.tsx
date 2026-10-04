import { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useAula } from '@/hooks/useAula';
import { useAulaProgress } from '@/hooks/useAulaProgress';
import { useModulo } from '@/hooks/useModulo';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { AulaQuiz } from './AulaQuiz';
import { LearningShell } from './LearningShell';
import { LessonNavigator } from './LessonNavigator';

interface AulaTextoProps {
  aulaId: number;
  moduloId: number;
  onBack: () => void;
  onSelectAula: (aulaId: number) => void;
}

export function AulaTexto({ aulaId, moduloId, onBack, onSelectAula }: AulaTextoProps) {
  const { aula, setAula, loading, error: aulaError, refetch } = useAula(aulaId);
  const { modulo } = useModulo(moduloId);
  const { concluir, salvarProgresso, loading: concluding, error: progressError } = useAulaProgress();
  const [showQuiz, setShowQuiz] = useState(false);
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const restored = useRef(false);
  const pages = aula?.pages ?? [];
  const hasQuiz = (aula?.quiz?.length ?? 0) > 0;
  const { currentPage, isLastPage, goNext, goPrev, goTo } = usePageNavigation({
    totalPages: pages.length,
    enabled: !showQuiz,
    onLastPage: hasQuiz && !aula?.completed ? () => setShowQuiz(true) : undefined,
  });

  useEffect(() => {
    if (!aula || restored.current) return;
    restored.current = true;
    goTo(Math.min(aula.progress.lastPage, Math.max(0, pages.length - 1)));
  }, [aula?.id, pages.length, goTo]);

  useEffect(() => {
    if (!aula || !restored.current || showQuiz || aula.completed || !pages.length) return;
    const timer = window.setTimeout(() => {
      const percent = Math.min(99, Math.round(((currentPage + 1) / pages.length) * 100));
      void salvarProgresso(aula.id, { progress_percent: percent, last_page: currentPage });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [aula?.id, aula?.completed, currentPage, pages.length, salvarProgresso, showQuiz]);

  const handleComplete = async () => {
    const result = await concluir(aulaId);
    if (!result) return;
    setXpGanho(result.xp_ganho);
    setAula((previous) => previous ? { ...previous, completed: true, progress: { ...previous.progress, percent: 100 } } : previous);
  };

  if (loading || !aula) {
    return <div className="learning-content-loading">{aulaError
      ? <div role="alert"><p>{aulaError}</p><AppButton onClick={() => void refetch()}>Tentar novamente</AppButton><AppButton variant="ghost" onClick={onBack}>Voltar ao módulo</AppButton></div>
      : 'Preparando a leitura...'}</div>;
  }

  const readerProgress = aula.completed ? 100 : pages.length ? Math.round(((currentPage + 1) / pages.length) * 100) : 0;
  const canCompleteWithoutQuiz = isLastPage && !hasQuiz && !aula.completed && xpGanho === null;

  return (
    <LearningShell
      eyebrow={modulo?.title ?? 'Leitura guiada'}
      title={showQuiz ? `Avaliação · ${aula.title}` : aula.title}
      description={showQuiz ? 'Responda às perguntas para concluir esta fase.' : aula.description}
      onBack={onBack}
      progress={showQuiz ? 100 : readerProgress}
      progressLabel={showQuiz ? 'Leitura concluída · avaliação em andamento' : `Página ${pages.length ? currentPage + 1 : 0} de ${pages.length}`}
      hideReaderProgressLabel={!showQuiz}
      meta={[
        { label: 'Páginas', value: pages.length },
        { label: 'Recompensa', value: `${aula.xp} XP` },
        { label: 'Formato', value: showQuiz ? 'Quiz' : 'Leitura' },
      ]}
      aside={showQuiz ? undefined : <LessonNavigator modulo={modulo} activeAulaId={aulaId} onSelectAula={onSelectAula} />}
      footer={!showQuiz ? <>
        <div className="learning-lesson-footer-status">
          <BookOpen size={17} /><div><span>Progresso de leitura</span><strong>{readerProgress}%</strong></div>
        </div>
        {(aula.completed || xpGanho !== null) && <div className="learning-reader-complete"><CheckCircle2 size={15} /> Leitura concluída</div>}
        {progressError && <p role="alert">{progressError}</p>}
      </> : undefined}
    >
      {showQuiz ? <AulaQuiz aula={aula} onBack={() => setShowQuiz(false)} onComplete={onBack} /> : (
        <div className="text-learning-stage">
          {pages.length ? <article key={`${aulaId}-${currentPage}`} className="text-learning-page" aria-label={`Página ${currentPage + 1} de ${pages.length}`}>
            {pages[currentPage]?.trim()
              ? <p>{pages[currentPage].trim()}</p>
              : <p className="text-learning-empty-page">Esta página não possui texto.</p>}
          </article> : <div className="text-learning-empty" role="status"><BookOpen size={34} /><strong>Conteúdo de leitura indisponível</strong><span>Esta aula ainda não possui páginas publicadas.</span></div>}

          {pages.length > 0 && <nav className="comic-reader-navigation" aria-label="Navegação da leitura">
            <button type="button" className="classroom-page-button" onClick={goPrev} disabled={currentPage === 0}>
              <ChevronLeft size={18} /><span>Página anterior</span>
            </button>
            <span className="classroom-page-counter" aria-live="polite">Página {currentPage + 1} de {pages.length}</span>
            <button type="button" className="classroom-page-button is-primary" onClick={canCompleteWithoutQuiz ? () => void handleComplete() : goNext}
              disabled={concluding || (isLastPage && (aula.completed || (!hasQuiz && !canCompleteWithoutQuiz)))}>
              <span>{concluding ? 'Registrando...' : isLastPage && hasQuiz && !aula.completed ? 'Iniciar avaliação' : canCompleteWithoutQuiz ? 'Concluir leitura' : 'Próxima página'}</span><ChevronRight size={18} />
            </button>
          </nav>}

          {xpGanho !== null && <div className="learning-xp-reveal"><Sparkles size={18} /><div><span>Leitura concluída</span><strong>+{xpGanho} XP adicionados</strong></div></div>}
        </div>
      )}
    </LearningShell>
  );
}
