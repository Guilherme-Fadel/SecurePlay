import { ArrowLeft, Lock, RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import type { AulaErrorKind } from '@/hooks/useAula';
import '@/styles/lesson.css';

interface LessonStateProps {
  message: string;
  kind: AulaErrorKind | null;
  onRetry: () => unknown;
  onBack: () => void;
}

const TITLES: Record<AulaErrorKind, string> = {
  denied: 'Aula bloqueada',
  missing: 'Aula indisponível',
  failed: 'A aula não carregou',
};

/** Erro ao abrir a aula: falha (tentar de novo), acesso negado (403) ou inexistente (404). */
export function LessonState({ message, kind, onRetry, onBack }: LessonStateProps) {
  const resolved = kind ?? 'failed';
  return (
    <div className="lesson-v">
      <section className="lesson-state" aria-labelledby="lesson-state-title">
        <div className="lesson-state-art" aria-hidden="true">
          {resolved === 'denied' ? <Lock size={44} strokeWidth={2.6} /> : <BrandCharacter expression="surprised" />}
        </div>
        <h1 id="lesson-state-title" className="lesson-display">{TITLES[resolved]}</h1>
        <p role="alert">{message}</p>
        <div className="lesson-state-actions">
          {resolved === 'failed' && (
            <AppButton variant="chunky" tone="yellow" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={() => { void onRetry(); }}>
              Tentar novamente
            </AppButton>
          )}
          <AppButton variant="chunky" tone="ghost" icon={<ArrowLeft size={18} aria-hidden="true" />} onClick={onBack}>
            Voltar ao módulo
          </AppButton>
        </div>
      </section>
    </div>
  );
}
