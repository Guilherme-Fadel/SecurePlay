import { RefreshCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { GameDeckTable } from './GameDeckTable';

/** Esqueleto: três cartas em leque, sem dados fictícios nem controles ativos. */
export function GameDeckSkeleton() {
  return (
    <GameDeckTable lead="Embaralhando as cartas." busy>
      <div className="dk-skeleton" role="status" aria-label="Carregando jogos">
        <span /><span /><span />
      </div>
    </GameDeckTable>
  );
}

interface GameDeckMessageProps {
  kind: 'error' | 'empty';
  onRetry?: () => void;
}

const MESSAGES = {
  error: { lead: 'As cartas não chegaram desta vez.', title: 'Não foi possível carregar os jogos', line: 'Confira sua conexão e tente novamente.' },
  empty: { lead: 'Ainda não há cartas na sua mão.', title: 'Nenhum jogo disponível', line: 'Novas atividades aparecerão aqui assim que forem publicadas.' },
} as const;

export function GameDeckMessage({ kind, onRetry }: GameDeckMessageProps) {
  const text = MESSAGES[kind];
  return (
    <GameDeckTable lead={text.lead}>
      <div className="dk-message" role={kind === 'error' ? 'alert' : 'status'}>
        <strong className="dk-display">{text.title}</strong>
        <p>{text.line}</p>
        {kind === 'error' && onRetry && (
          <AppButton variant="chunky" tone="yellow" size="sm" icon={<RefreshCcw size={16} aria-hidden="true" />} onClick={onRetry}>
            Tentar novamente
          </AppButton>
        )}
      </div>
    </GameDeckTable>
  );
}
