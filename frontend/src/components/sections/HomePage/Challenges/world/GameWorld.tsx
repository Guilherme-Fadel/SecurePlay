import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import '@/styles/game-worlds.css';
import { WorldChip, WorldConfetti } from './WorldParts';

export type GameWorldId = 'quiz' | 'det' | 'esc' | 'pal';

export interface GameWorldProps {
  /** Mundo do jogo: define as cores (`--g`, `--gb`...) e a classe `gw--<world>`. */
  world: GameWorldId;
  /** Nome do jogo no sistema, ex.: "Quiz Relâmpago". É o único nome mostrado na placa. */
  title: string;
  /** Imagem do jogo (pixel art), mostrada na placa. */
  artwork: string;
  onExit: () => void;
  /** Canto direito da barra de cima, ex.: `<><span>Pergunta 3 de 8</span><WorldFlags total={8} done={2} /></>`. */
  chip?: ReactNode;
  /** Decoração de fundo da cena (spans absolutos). Fica atrás do conteúdo e não recebe cliques. */
  deco?: ReactNode;
  /** Mostra confete na camada de decoração (tela de resultado). */
  celebrate?: boolean;
  /** Classe extra no elemento raiz, para o CSS próprio do jogo. */
  className?: string;
  /** Área principal da cena. */
  children: ReactNode;
}

/**
 * Raiz da cena de um jogo: fundo, barra de cima (voltar + placa + chip) e a área principal.
 * Deve ser filho direto da área de conteúdo da Home.
 */
export function GameWorld({ world, title, artwork, onExit, chip, deco, celebrate = false, className, children }: GameWorldProps) {
  return (
    <div className={cn('gw', `gw--${world}`, className)}>
      <div className="gw-deco" aria-hidden="true">
        {deco}
        {celebrate && <WorldConfetti />}
      </div>

      <header className="gw-hud">
        <button type="button" className="gw-icbtn" onClick={onExit} aria-label="Sair do jogo e voltar para os jogos">
          <ArrowLeft size={22} strokeWidth={2.6} aria-hidden="true" />
        </button>
        <div className="gw-sign">
          <img className="gw-px" src={artwork} alt="" width={46} height={46} />
          <span className="gw-disp">{title}</span>
        </div>
        <span className="gw-sp" />
        {chip ? <WorldChip>{chip}</WorldChip> : null}
      </header>

      <div className="gw-main">{children}</div>
    </div>
  );
}
