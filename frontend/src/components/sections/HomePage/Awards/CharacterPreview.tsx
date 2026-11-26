import type { ReactNode } from 'react';
import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import { characterColorCss, type CharacterColor } from '@/components/shared/Character/characterColor';
import type { CharacterLook } from '@/components/shared/Character/characterLook';
import { cn } from '@/lib/utils';
import type { CurrentUser } from '@/services/me';
import { cardTheme, stageTheme } from './characterModel';

interface PreviewProps {
  look: CharacterLook;
  user: CurrentUser | null;
  level: number | null;
  /** Cor base do personagem (do backend). */
  color: CharacterColor;
  /** Inventário de cores, ao lado do palco. */
  colors: ReactNode;
}

/**
 * As duas leituras do personagem: o palco (completo, com o fundo equipado) e a
 * linha do placar (compacta, com o tema do card em faixa; sem fundo nem efeito).
 * Ao lado do palco ficam as cores base; no celular empilha: palco, cores, card.
 */
export function CharacterPreview({ look, user, level, color, colors }: PreviewProps) {
  const stage = stageTheme(look.background);
  const board = cardTheme(look.card);
  const body = characterColorCss(color);
  const name = user?.nickname || user?.name || 'Você';

  return (
    <div className="chr-preview">
      <div className="chr-readings">
        <figure className="chr-reading chr-reading--stage">
          <div className={cn('chr-stage', stage.className)} style={stage.style}>
            <div className="chr-stage-actor">
              <CharacterAvatar look={look} color={body} variant="full" label="Seu personagem no palco" />
            </div>
          </div>
          <figcaption>No palco e no perfil</figcaption>
        </figure>
        <div className="chr-readings-base">{colors}</div>
        <figure className="chr-reading chr-reading--board">
          <div className={cn('chr-board', board.className)} style={board.style}>
            <span className="chr-board-pet">
              <CharacterAvatar look={look} color={body} variant="compact" label="Seu personagem no placar" />
            </span>
            <span className="chr-board-id">
              <strong>{name}</strong>
              {level !== null && <small>Nível {level}</small>}
            </span>
          </div>
          <figcaption>Na linha do placar</figcaption>
        </figure>
      </div>
    </div>
  );
}
