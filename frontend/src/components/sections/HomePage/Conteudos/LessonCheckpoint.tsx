import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { useReducedMotion } from 'motion/react';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { formatXp } from './lessonContext';

const COUNT_DURATION_MS = 900;

/** Conta de 0 até o XP informado pelo servidor; com movimento reduzido, mostra o valor direto. */
function useCountUp(target: number) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? target : 0);
  useEffect(() => {
    if (reduceMotion || target <= 0) {
      setShown(target);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - started) / COUNT_DURATION_MS);
      setShown(Math.round(target * ratio));
      if (ratio < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduceMotion]);
  return shown;
}

export function LessonXpCount({ xp }: { xp: number }) {
  const shown = useCountUp(xp);
  return (
    <div className="lesson-count">
      <b aria-hidden="true">+{formatXp(shown)}</b><small aria-hidden="true">XP</small>
      <span className="lesson-sr">+{formatXp(xp)} XP</span>
    </div>
  );
}

interface LessonCheckpointProps {
  title: string;
  summary?: string;
  xp: number;
  actions: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
  /** compact: faixa amarela sob o quadrinho/vídeo; full: resultado do quiz. */
  variant?: 'full' | 'compact';
}

/** Resultado "Checkpoint": XP vem de `submitQuiz`/`concluir` (o servidor é a autoridade). */
export function LessonCheckpoint({ title, summary, xp, actions, headingRef, variant = 'full' }: LessonCheckpointProps) {
  if (variant === 'compact') {
    return <CompactCheckpoint title={title} xp={xp} actions={actions} />;
  }
  return (
    <div className="lesson-result" role="status">
      <BrandCharacter className="lesson-result-art" expression="happy" />
      <p className="lesson-eyebrow">Checkpoint!</p>
      <h2 ref={headingRef} tabIndex={-1} className="lesson-display">{title}</h2>
      {summary && <p>{summary}</p>}
      <LessonXpCount xp={xp} />
      <div className="lesson-result-actions">{actions}</div>
    </div>
  );
}

/**
 * Faixa de conclusão sem quiz. Só aparece depois do "Concluir", cujo botão some;
 * por isso o título recebe o foco na montagem (senão ele cairia no body).
 */
function CompactCheckpoint({ title, xp, actions }: Pick<LessonCheckpointProps, 'title' | 'xp' | 'actions'>) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="lesson-donebox" role="status">
      <h3 ref={titleRef} tabIndex={-1}>{title}</h3>
      <LessonXpCount xp={xp} />
      {actions}
    </div>
  );
}
