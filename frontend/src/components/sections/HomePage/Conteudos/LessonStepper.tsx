import { Check } from 'lucide-react';

export type LessonStepStatus = 'done' | 'current' | 'next';

export interface LessonStepItem {
  key: string;
  label: string;
  status: LessonStepStatus;
  /** Ausente quando a etapa não pode ser aberta agora (atual, bloqueada ou só indicativa). */
  onSelect?: () => void;
}

/** Faixa fina "Etapas desta aula" numa linha: concluídas com check, atual em destaque, próximas tracejadas. */
export function LessonStepper({ steps, label = 'Etapas desta aula' }: { steps: LessonStepItem[]; label?: string }) {
  if (!steps.length) return null;
  const last = steps.length - 1;
  return (
    <nav className="lesson-steps" aria-label={label}>
      <p aria-hidden="true">{label}</p>
      <ol>
        {steps.map((step, index) => {
          const content = (
            <>
              <i aria-hidden="true">{step.status === 'done' ? <Check size={13} strokeWidth={3.6} /> : index + 1}</i>
              <span className="lesson-step-label">{step.label}</span>
              {step.status === 'done' && <span className="lesson-sr"> (concluída)</span>}
            </>
          );
          const className = `lesson-step is-${step.status}`;
          return (
            <li key={step.key}>
              {step.onSelect && step.status !== 'current'
                ? <button type="button" className={className} onClick={step.onSelect}>{content}</button>
                : <span className={className} aria-current={step.status === 'current' ? 'step' : undefined}>{content}</span>}
              {index < last && <span className={`lesson-step-line ${step.status === 'done' ? 'is-on' : 'is-off'}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
