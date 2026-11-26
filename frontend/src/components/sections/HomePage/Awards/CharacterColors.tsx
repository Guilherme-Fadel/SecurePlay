import { Check, Loader2 } from 'lucide-react';
import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import { CHARACTER_COLORS, characterColorLabel, type CharacterColor } from '@/components/shared/Character/characterColor';
import { cn } from '@/lib/utils';

export const characterColorId = (color: CharacterColor) => `chr-color-${color}`;

interface ColorsProps {
  color: CharacterColor;
  /** Cor em gravação (o botão mostra o carregamento). */
  changing: CharacterColor | null;
  /** Há uma troca em andamento (de cor, item ou kit): os botões ficam desabilitados. */
  locked: boolean;
  onChoose: (color: CharacterColor) => void;
}

/**
 * Inventário de cores base: as cinco são grátis e a escolha vale na hora. A cor
 * em uso vem do backend; o cliente só pede a troca.
 */
export function CharacterColors({ color, changing, locked, onChoose }: ColorsProps) {
  return (
    <section className="chr-base" aria-label="Cor do personagem (grátis)">
      <ul className="chr-base-list">
        {CHARACTER_COLORS.map((option) => {
          const selected = option.color === color;
          return (
            <li key={option.color}>
              <button
                type="button"
                id={characterColorId(option.color)}
                className={cn('chr-base-btn', selected && 'is-selected')}
                aria-pressed={selected}
                disabled={locked && !selected}
                onClick={() => { if (!selected) onChoose(option.color); }}
              >
                <span className="chr-base-pet" aria-hidden="true">
                  <CharacterAvatar look={{}} color={option.css} variant="compact" />
                </span>
                <span className="chr-base-name">{characterColorLabel(option.color)}</span>
                <span className="chr-base-mark" aria-hidden="true">
                  {changing === option.color ? <Loader2 className="animate-spin" size={18} /> : selected ? <Check size={18} strokeWidth={3} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
