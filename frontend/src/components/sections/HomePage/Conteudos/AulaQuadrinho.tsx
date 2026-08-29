import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, FileQuestion, Info, Sparkles } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useAula } from '@/hooks/useAula';
import { useAulaProgress } from '@/hooks/useAulaProgress';
import { useModulo } from '@/hooks/useModulo';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { AulaQuiz } from './AulaQuiz';
import { LearningShell } from './LearningShell';
import { LessonNavigator } from './LessonNavigator';

interface AulaQuadrinhoProps {
  aulaId: number;
  moduloId: number;
  onBack: () => void;
  onSelectAula: (aulaId: number) => void;
}

const COMIC_PLACEHOLDER_PAGES = [
  '/content/comic-placeholders/phishing-awareness-01.png',
  '/content/comic-placeholders/phishing-awareness-02.png',
  '/content/comic-placeholders/phishing-awareness-03.png',
];

const pageVariants = {
  enter: (direction: number) => ({
    opacity: 0.35,
    rotateY: direction > 0 ? -72 : 72,
    x: direction > 0 ? 34 : -34,
    scale: 0.985,
  }),
  center: { opacity: 1, rotateY: 0, x: 0, scale: 1 },
  exit: (direction: number) => ({
    opacity: 0.25,
    rotateY: direction > 0 ? 72 : -72,
    x: direction > 0 ? -28 : 28,
    scale: 0.985,
  }),
};

export function AulaQuadrinho({ aulaId, moduloId, onBack, onSelectAula }: AulaQuadrinhoProps) {
  const { aula, loading } = useAula(aulaId);
  const { modulo } = useModulo(moduloId);
  const { concluir, salvarProgresso, loading: concluding } = useAulaProgress();
  const [showQuiz, setShowQuiz] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const restored = useRef(false);

  const aulaPages = aula?.pages?.filter(Boolean) ?? [];
  const usingPlaceholders = aulaPages.length === 0;
  const pages = usingPlaceholders ? COMIC_PLACEHOLDER_PAGES : aulaPages;
  const hasQuiz = (aula?.quiz?.length ?? 0) > 0;
  const quizAlreadyAnswered = aula?.completed ?? false;
  const { currentPage, direction, isLastPage, goNext, goPrev, goTo, handleTouchStart, handleTouchEnd } =
    usePageNavigation({
      totalPages: pages.length,
      onLastPage: hasQuiz && !quizAlreadyAnswered ? () => setShowQuiz(true) : undefined,
    });

  useEffect(() => {
    if (!aula || restored.current) return;
    restored.current = true;
    goTo(Math.min(aula.progress.lastPage, Math.max(0, pages.length - 1)));
  }, [aula?.id, pages.length, goTo]);

  useEffect(() => {
    if (!aula || !restored.current || showQuiz) return;
    const timer = window.setTimeout(() => {
      const percent = aula.completed || !pages.length
        ? aula.completed ? 100 : 0
        : Math.min(99, Math.round(((currentPage + 1) / pages.length) * 100));
      void salvarProgresso(aula.id, { progress_percent: percent, last_page: currentPage });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [aula?.id, aula?.completed, currentPage, pages.length, salvarProgresso, showQuiz]);

  const handleCompleteWithoutQuiz = async () => {
    const result = await concluir(aulaId);
    if (result) setXpGanho(result.xp_ganho);
  };

  if (loading || !aula) {
    return <div className="learning-content-loading">Preparando o leitor...</div>;
  }

  const readerProgress = aula.completed ? 100 : pages.length ? Math.round(((currentPage + 1) / pages.length) * 100) : 0;

  return (
    <LearningShell
      eyebrow={modulo?.title ?? 'Leitura guiada'}
      title={showQuiz ? `Avaliação · ${aula.title}` : aula.title}
      description={showQuiz ? 'Responda às perguntas para concluir esta fase.' : aula.description}
      icon={showQuiz ? FileQuestion : BookOpen}
      onBack={onBack}
      progress={showQuiz ? 100 : readerProgress}
      progressLabel={showQuiz ? 'Leitura concluída · avaliação em andamento' : `Página ${Math.min(currentPage + 1, pages.length || 1)} de ${pages.length}`}
      meta={[
        { label: 'Páginas', value: pages.length },
        { label: 'Recompensa', value: `${aula.xp} XP` },
        { label: 'Formato', value: showQuiz ? 'Quiz' : 'Quadrinho' },
      ]}
      aside={showQuiz ? undefined : <LessonNavigator modulo={modulo} activeAulaId={aulaId} onSelectAula={onSelectAula} />}
      footer={!showQuiz ? (
        <>
          <div className="learning-lesson-footer-status">
            <BookOpen size={17} /><div><span>Progresso de leitura</span><strong>{readerProgress}%</strong></div>
          </div>
          {isLastPage && hasQuiz && !quizAlreadyAnswered && (
            <AppButton icon={<FileQuestion size={16} />} onClick={() => setShowQuiz(true)}>Iniciar avaliação</AppButton>
          )}
          {isLastPage && !hasQuiz && !aula.completed && xpGanho === null && (
            <AppButton icon={<CheckCircle2 size={16} />} onClick={handleCompleteWithoutQuiz} disabled={concluding}>Concluir leitura</AppButton>
          )}
          {(aula.completed || xpGanho !== null) && <div className="learning-reader-complete"><CheckCircle2 size={15} /> Leitura concluída</div>}
        </>
      ) : undefined}
    >
      {showQuiz ? (
        <AulaQuiz aula={aula} onBack={() => setShowQuiz(false)} onComplete={onBack} />
      ) : (
        <div className="comic-learning-stage">
          <div className="comic-reader-toolbar">
            <div><BookOpen size={16} /><span>LEITOR IMERSIVO</span></div>
            {usingPlaceholders && <span className="comic-reader-demo-label">CONTEÚDO DEMONSTRATIVO</span>}
            {aula.description && (
              <button onClick={() => setShowBriefing((visible) => !visible)} className={showBriefing ? 'is-active' : ''}><Info size={14} /> Briefing</button>
            )}
          </div>

          {showBriefing && aula.description && (
            <div className="comic-reader-briefing"><strong>Contexto da missão</strong><p>{aula.description}</p></div>
          )}

          <div className="comic-book" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className="comic-book-spine" />
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={currentPage}
                className={`comic-page-sheet ${direction > 0 ? 'turn-forward' : 'turn-backward'}`}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.52, ease: [0.22, 0.72, 0.2, 1] }}
              >
                {pages[currentPage]
                  ? <img
                      src={pages[currentPage]}
                      alt={`Página ${currentPage + 1}`}
                      draggable={false}
                      onError={(event) => {
                        const fallback = COMIC_PLACEHOLDER_PAGES[currentPage % COMIC_PLACEHOLDER_PAGES.length];
                        if (!event.currentTarget.src.endsWith(fallback)) {
                          event.currentTarget.src = fallback;
                        }
                      }}
                    />
                  : <div className="comic-page-empty"><BookOpen size={38} /><strong>Página indisponível</strong></div>}
              </motion.div>
            </AnimatePresence>

            <button className="comic-page-control is-prev" onClick={goPrev} disabled={currentPage === 0} aria-label="Página anterior"><ChevronLeft size={21} /></button>
            <button className="comic-page-control is-next" onClick={goNext} aria-label={isLastPage && hasQuiz ? 'Ir para avaliação' : 'Próxima página'}><ChevronRight size={21} /></button>
          </div>

          <div className="comic-reader-navigation">
            <span>{String(currentPage + 1).padStart(2, '0')}</span>
            <div>
              {pages.map((_, index) => <button key={index} onClick={() => goTo(index)} className={`${index === currentPage ? 'is-active' : ''} ${index < currentPage ? 'is-read' : ''}`} aria-label={`Ir para página ${index + 1}`} />)}
            </div>
            <span>{String(pages.length).padStart(2, '0')}</span>
          </div>

          {xpGanho !== null && <div className="learning-xp-reveal"><Sparkles size={18} /><div><span>Leitura concluída</span><strong>+{xpGanho} XP adicionados</strong></div></div>}
        </div>
      )}
    </LearningShell>
  );
}
