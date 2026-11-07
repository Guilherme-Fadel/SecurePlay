import { AppButton } from '@/components/ui/buttons/AppButton';
import type { ProgressSaveStatus as SaveStatus } from '@/hooks/useProgressSave';

export function ProgressSaveStatus({ status, onRetry }: { status: SaveStatus; onRetry: () => unknown }) {
  if (status === 'idle') return null;
  return (
    <div className={`lesson-save is-${status}`}>
      <p role="status">{status === 'saving' ? 'Salvando progresso...'
        : status === 'saved' ? 'Progresso salvo'
          : 'Progresso pendente. Tente salvar antes de sair desta aula.'}</p>
      {status === 'pending' && <AppButton variant="chunky" tone="ghost" size="sm" onClick={() => { void onRetry(); }}>Tentar salvar novamente</AppButton>}
    </div>
  );
}
