import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Maximize, Minimize } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { missionRoomAssets } from '@/lib/staticArtwork';
import '@/styles/classroom-library.css';

interface LearningShellProps {
  eyebrow: string;
  title: string;
  description?: string | null;
  onBack: () => void;
  progress: number;
  progressLabel: string;
  meta?: Array<{ label: string; value: ReactNode }>;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  readerTools?: ReactNode;
  hideReaderProgressLabel?: boolean;
}

export function LearningShell({
  eyebrow,
  title,
  description,
  onBack,
  progress,
  progressLabel,
  meta = [],
  children,
  aside,
  footer,
  readerTools,
  hideReaderProgressLabel = false,
}: LearningShellProps) {
  const safeProgress = Math.max(0, Math.min(100, progress));
  const [focused, setFocused] = useState(false);
  const [asideOpen, setAsideOpen] = useState(false);
  const asideId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const focusButtonRef = useRef<HTMLButtonElement>(null);
  const asideButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!focused && !asideOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (focused) {
        setFocused(false);
        focusButtonRef.current?.focus();
      } else {
        if (!(event.target instanceof Node) || !shellRef.current?.contains(event.target)) return;
        setAsideOpen(false);
        asideButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleEscape);
    if (focused) shellRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    return () => window.removeEventListener('keydown', handleEscape);
  }, [focused, asideOpen]);

  return (
    <div ref={shellRef} className={`learning-shell classroom-library ${focused ? 'is-focused' : ''}`}>
      <header className="learning-shell-header">
        <AppButton variant="ghost" size="sm" icon={<ArrowLeft size={15} />} onClick={onBack}>
          Voltar ao módulo
        </AppButton>

        <div className="learning-shell-identity">
          <div><img src={missionRoomAssets['missions-room-emblem']} alt="" /></div>
          <section>
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </section>
        </div>

        <div className="learning-shell-meta">
          {meta.filter((item) => item.label === 'Recompensa').map((item) => (
            <div className="learning-shell-reward" key={item.label}>
              <img src={missionRoomAssets['icon-star']} alt="" />
              <span>{item.label}</span><strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <main className={`learning-shell-stage ${aside && asideOpen ? 'has-aside' : ''}`}>
        <section className="learning-shell-content" aria-label={title}>
          <div className="classroom-reader-tools">
            {readerTools}
            {!hideReaderProgressLabel && <span aria-live="polite">{focused && <strong>{title} · </strong>}{progressLabel}</span>}
            {aside && !focused && <button
              ref={asideButtonRef}
              className="classroom-aside-toggle"
              type="button"
              aria-expanded={asideOpen}
              aria-controls={asideId}
              onClick={() => setAsideOpen((value) => !value)}
            >
              {asideOpen ? <ChevronLeft className="classroom-aside-icon-desktop" size={16} aria-hidden="true" /> : <ChevronRight className="classroom-aside-icon-desktop" size={16} aria-hidden="true" />}
              {asideOpen ? <ChevronUp className="classroom-aside-icon-mobile" size={16} aria-hidden="true" /> : <ChevronDown className="classroom-aside-icon-mobile" size={16} aria-hidden="true" />}
              {asideOpen ? 'Ocultar aulas' : 'Ver aulas do módulo'}
            </button>}
            <button ref={focusButtonRef} type="button" aria-pressed={focused} onClick={() => {
              setFocused((value) => !value);
              if (!focused) setAsideOpen(false);
            }}>
              {focused ? <Minimize size={17} /> : <Maximize size={17} />}
              {focused ? 'Sair do modo foco' : 'Modo foco'}
            </button>
          </div>
          {children}
        </section>
        {aside && <aside id={asideId} className="learning-shell-aside" hidden={!asideOpen || focused}>{aside}</aside>}
      </main>

      {footer && <footer className="learning-shell-footer">{footer}
        <div className="classroom-reading-progress" role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeProgress}>
          <span style={{ width: `${safeProgress}%` }} />
        </div>
      </footer>}
    </div>
  );
}
