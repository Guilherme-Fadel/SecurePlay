import { AlertTriangle, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { WorldButton } from './WorldParts';

interface WorldStateProps {
  title: string;
  description: string;
  /** `loading` (padrão), `error` ou `empty`. */
  tone?: 'loading' | 'error' | 'empty';
  /** Mostra o botão "Voltar aos jogos". */
  onExit?: () => void;
  /** Ações extras (ex.: "Tentar de novo"), antes do botão de voltar. */
  children?: ReactNode;
}

/** Mensagem de carregando / erro / vazio / enviando, dentro da cena (a barra de cima continua). */
export function WorldState({ title, description, tone = 'loading', onExit, children }: WorldStateProps) {
  const Icon = tone === 'loading' ? LoaderCircle : AlertTriangle;
  return (
    <div className="gw-state-wrap">
      <div className={cn('gw-paper gw-state', `is-${tone}`)} role={tone === 'error' ? 'alert' : 'status'}>
        <span className="gw-state-ic" aria-hidden="true"><Icon size={30} strokeWidth={2.6} /></span>
        <strong className="gw-disp">{title}</strong>
        <p>{description}</p>
        {(children || onExit) && (
          <div className="gw-cta">
            {children}
            {onExit && <WorldButton variant="ghost" onClick={onExit}>Voltar aos jogos</WorldButton>}
          </div>
        )}
      </div>
    </div>
  );
}
