import { BRAND_CHARACTER_BODY } from '@/components/shared/BrandCharacter';
import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import type { CharacterLook } from '@/components/shared/Character/characterLook';
import { cn } from '@/lib/utils';
import type { CurrentUser } from '@/services/me';
import { cardTheme, stageTheme } from './characterModel';

interface PreviewProps {
  look: CharacterLook;
  user: CurrentUser | null;
  level: number | null;
}

/**
 * As duas leituras do personagem: o palco (completo, com o fundo equipado) e a
 * linha do placar (compacta, com o tema do card; sem fundo nem efeito).
 */
export function CharacterPreview({ look, user, level }: PreviewProps) {
  const stage = stageTheme(look.background);
  const board = cardTheme(look.card);
  const name = user?.nickname || user?.name || 'Você';

  return (
    <div className="chr-preview">
      <div className="chr-readings">
        <figure className="chr-reading">
          <div className={cn('chr-stage', stage.className)} style={stage.style}>
            <div className="chr-stage-actor">
              <CharacterAvatar look={look} color={BRAND_CHARACTER_BODY} variant="full" label="Seu personagem no palco" />
            </div>
          </div>
          <figcaption>No palco e no perfil</figcaption>
        </figure>
        <figure className="chr-reading chr-reading--board">
          <div className={cn('chr-board', board.className)} style={board.style}>
            <span className="chr-board-pet">
              <CharacterAvatar look={look} color={BRAND_CHARACTER_BODY} variant="compact" label="Seu personagem no placar" />
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
