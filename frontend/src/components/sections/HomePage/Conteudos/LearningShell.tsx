import { ArrowLeft, Maximize, Minimize, Star } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ModuloDetalhes } from '@/services/conteudo';
import { LESSON_TYPE_LABEL, formatXp, lessonPosition, type LessonType } from './lessonContext';
import '@/styles/lesson.css';

interface LearningShellProps {
  aulaId: number;
  title: string;
  type: LessonType;
  xp: number;
  /** Minutos; o chip só aparece quando > 0. */
  duration?: number;
  /** Tamanho da aula, como "4 etapas + quiz". */
  sizeLabel?: string | null;
  modulo: ModuloDetalhes | null;
  onBack: () => void;
  progress: number;
  progressLabel: string;
  steps?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
}

/** Casca da aula: voltar ao módulo, título, chips, modo foco, etapas, conteúdo, aside e rodapé de progresso. */
export function LearningShell({
  aulaId,
  title,
  type,
  xp,
  duration = 0,
  sizeLabel,
  modulo,
  onBack,
  progress,
  progressLabel,
  steps,
  children,
  aside,
  footer,
}: LearningShellProps) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const [focused, setFocused] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const position = lessonPosition(modulo, aulaId);
  const positionLabel = position.number ? `Aula ${position.number} de ${position.total}` : LESSON_TYPE_LABEL[type];

  useEffect(() => {
    if (!focused) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setFocused(false);
      focusButtonRef.current?.focus();
    };
    window.addEventListener('keydown', handleEscape);
    shellRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    return () => window.removeEventListener('keydown', handleEscape);
  }, [focused]);

  return (
    <div ref={shellRef} className={`lesson-v ${focused ? 'is-focused' : ''}`}>
      <button type="button" className="lesson-back" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.6} aria-hidden="true" />Voltar ao módulo
      </button>

      <header className="lesson-head">
        <div>
          <p className="lesson-eyebrow">{positionLabel}</p>
          <h1 className="lesson-display">{title}</h1>
          <div className="lesson-meta">
            <span className={`lesson-chip is-${type}`}>{LESSON_TYPE_LABEL[type]}</span>
            {sizeLabel && <span>{sizeLabel}</span>}
            {duration > 0 && <span>{duration} min</span>}
            <span className="lesson-xp"><Star size={15} fill="var(--sp-yellow)" stroke="var(--sp-black)" strokeWidth={1.6} aria-hidden="true" />{formatXp(xp)} XP</span>
          </div>
        </div>
        <button ref={focusButtonRef} type="button" className="lesson-focus-toggle" aria-pressed={focused} onClick={() => setFocused((value) => !value)}>
          {focused ? <Minimize size={16} aria-hidden="true" /> : <Maximize size={16} aria-hidden="true" />}
          {focused ? 'Sair do modo foco' : 'Modo foco'}
        </button>
      </header>

      {steps}

      <div className="lesson-layout">
        <main className="lesson-main">
          {children}
          {footer && (
            <footer className="lesson-footer">
              <div className="lesson-progress">
                <span>{progressLabel}</span>
                <div className="lesson-progress-bar" role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeProgress}>
                  <span style={{ width: `${safeProgress}%` }} />
                </div>
                <strong>{safeProgress}%</strong>
              </div>
              {footer}
            </footer>
          )}
        </main>
        {aside && !focused && <aside className="lesson-aside" aria-label="Sua posição na trilha">{aside}</aside>}
      </div>
    </div>
  );
}
