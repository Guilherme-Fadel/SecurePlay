import { AppButton } from '@/components/ui/buttons/AppButton';
import type { ProgressSaveStatus as SaveStatus } from '@/hooks/useProgressSave';

export function ProgressSaveStatus({ status, onRetry }: { status: SaveStatus; onRetry: () => unknown }) {
  if (status === 'idle') return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <p role="status">{status === 'saving' ? 'Salvando progresso...'
        : status === 'saved' ? 'Progresso salvo'
          : 'Progresso pendente. Tente salvar antes de sair desta aula.'}</p>
      {status === 'pending' && <AppButton size="sm" variant="ghost" onClick={() => { void onRetry(); }}>Tentar salvar novamente</AppButton>}
    </div>
  );
}
