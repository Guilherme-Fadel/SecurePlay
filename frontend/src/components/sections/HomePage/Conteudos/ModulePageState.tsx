import { Inbox, Lock, RotateCcw, TriangleAlert } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';

export type ModulePageStateKind = 'failed' | 'denied' | 'missing' | 'empty';

const COPY: Record<ModulePageStateKind, { title: string; fallback: string }> = {
  failed: { title: 'O módulo não carregou', fallback: 'Não foi possível carregar esta missão.' },
  denied: { title: 'Módulo bloqueado', fallback: 'Este módulo ainda está bloqueado para você.' },
  missing: { title: 'Módulo indisponível', fallback: 'Este módulo não está disponível.' },
  empty: { title: 'Ainda sem aulas', fallback: 'Este módulo ainda não tem aulas publicadas. Volte mais tarde.' },
};

interface ModulePageStateProps {
  kind: ModulePageStateKind;
  message?: string | null;
  onBack: () => void;
  onRetry?: () => void;
}

/** Erro (com tentar de novo), acesso negado pelo backend, módulo inexistente ou sem aulas. */
export function ModulePageState({ kind, message, onBack, onRetry }: ModulePageStateProps) {
  const copy = COPY[kind];
  const Icon = kind === 'denied' ? Lock : kind === 'empty' ? Inbox : TriangleAlert;
  return (
    <section className={`mv-state is-${kind}`} aria-labelledby="mv-state-title">
      <span className="mv-state-icon" aria-hidden="true"><Icon size={26} strokeWidth={2.4} /></span>
      <h2 id="mv-state-title" className="mv-display">{copy.title}</h2>
      <p role={kind === 'empty' ? 'status' : 'alert'}>{message || copy.fallback}</p>
      <div className="mv-state-actions">
        {kind === 'failed' && onRetry && (
          <AppButton variant="chunky" tone="yellow" size="md" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={onRetry}>Tentar novamente</AppButton>
        )}
        <AppButton variant="chunky" tone="ghost" size="md" onClick={onBack}>Voltar para o mapa</AppButton>
      </div>
    </section>
  );
}
