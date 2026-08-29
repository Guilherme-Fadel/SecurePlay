import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppButton } from '@/components/ui/buttons/AppButton';

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
}: LearningShellProps) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="learning-shell">
      <header className="learning-shell-header">
        <AppButton variant="ghost" size="sm" icon={<ArrowLeft size={15} />} onClick={onBack}>
          Voltar ao módulo
        </AppButton>

        <div className="learning-shell-identity">
          <div><Icon size={21} /></div>
          <section>
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </section>
        </div>

        <div className="learning-shell-meta">
          {meta.map((item) => (
            <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
          ))}
        </div>
      </header>

      <div className="learning-shell-progress">
        <div style={{ width: `${safeProgress}%` }} />
        <span>{progressLabel}</span>
      </div>

      <main className={`learning-shell-stage ${aside ? 'has-aside' : ''}`}>
        <section className="learning-shell-content">{children}</section>
        {aside && <aside className="learning-shell-aside">{aside}</aside>}
      </main>

      {footer && <footer className="learning-shell-footer">{footer}</footer>}
    </div>
  );
}
