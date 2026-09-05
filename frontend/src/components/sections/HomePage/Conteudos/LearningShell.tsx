import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { missionRoomAssets } from '@/lib/staticArtwork';
import '@/styles/classroom-library.css';

interface LearningShellProps {
  eyebrow: string;
  title: string;
  description?: string | null;
  icon: LucideIcon;
  onBack: () => void;
  progress: number;
  progressLabel: string;
  meta?: Array<{ label: string; value: ReactNode }>;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
  readerTools?: ReactNode;
}

export function LearningShell({
  eyebrow,
  title,
  description,
  icon: Icon,
  onBack,
  progress,
  progressLabel,
  meta = [],
  children,
  aside,
  footer,
  readerTools,
}: LearningShellProps) {
  const safeProgress = Math.max(0, Math.min(100, progress));
  const [focused, setFocused] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const focusButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!focused) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setFocused(false);
      focusButtonRef.current?.focus();
    };
    window.addEventListener('keydown', handleEscape);
    shellRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    return () => window.removeEventListener('keydown', handleEscape);
  }, [focused]);

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
          {meta.map((item) => (
            <div key={item.label}>
              {item.label === 'Recompensa'
                ? <img src={missionRoomAssets['icon-star']} alt="" />
                : <Icon size={22} aria-hidden="true" />}
              <span>{item.label}</span><strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <main className={`learning-shell-stage ${aside ? 'has-aside' : ''}`}>
        <section className="learning-shell-content" aria-label={title}>
          <div className="classroom-reader-tools">
            {readerTools}
            <span aria-live="polite">{focused && <strong>{title} · </strong>}{progressLabel}</span>
            <button ref={focusButtonRef} type="button" aria-pressed={focused} onClick={() => setFocused((value) => !value)}>
              {focused ? <Minimize size={17} /> : <Maximize size={17} />}
              {focused ? 'Sair do modo foco' : 'Modo foco'}
            </button>
          </div>
          {children}
        </section>
        {aside && <aside className="learning-shell-aside">{aside}</aside>}
      </main>

      {footer && <footer className="learning-shell-footer">{footer}
        <div className="classroom-reading-progress" role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeProgress}>
          <span style={{ width: `${safeProgress}%` }} />
        </div>
      </footer>}
    </div>
  );
}
