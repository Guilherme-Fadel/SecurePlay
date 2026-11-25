import { BRAND_CHARACTER_BODY } from '@/components/shared/BrandCharacter';
import { CardFrame } from '@/components/shared/Character/CardFrame';
import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import { cardTheme, stageTheme } from '@/components/sections/HomePage/Awards/characterModel';
import { cn } from '@/lib/utils';
import type { CharacterLook } from '@/services/dashboard';
import { FormSection } from './FormSection';
import { previewHasVisual } from './previewVisual';

/** Cor de corpo da marca (o aluno vê o personagem na cor dele; a prévia usa o padrão). */
const PREVIEW_BODY = BRAND_CHARACTER_BODY;

/** Prévia ao vivo: personagem inteiro (palco) e no formato do placar, como no provador do aluno. Usa a arte enviada (`artUrl`) ou, sem ela, o valor da biblioteca. */
export function CollectiblePreview({ look }: { look: CharacterLook }) {
  const empty = !previewHasVisual(look);
  // Fundo e card só mudam a prévia quando o item em edição é um deles.
  const stage = look.background ? stageTheme(look.background) : null;
  const board = look.card ? cardTheme(look.card) : null;
  return <FormSection title="Prévia ao vivo" help="Mostra o personagem com a arte enviada ou da biblioteca e o ajuste fino. A arte enviada só aparece depois do envio e é conferida de novo pelo backend ao salvar.">
    <div className="collectible-preview">
      <div className={cn('collectible-preview-stage', stage?.className)} style={stage?.style}>
        <CharacterAvatar look={look} color={PREVIEW_BODY} variant="full" label="Prévia do personagem com o colecionável" />
      </div>
      <div className={cn('collectible-preview-mini', board && 'has-card', board?.className)} style={board?.style}>
        <CharacterAvatar look={look} color={PREVIEW_BODY} variant="compact" />
        <span>No placar</span>
        {board && <CardFrame artUrl={board.frameUrl} />}
      </div>
      {empty && <p className="collectible-preview-note">Envie a arte para ver o colecionável no personagem.</p>}
    </div>
  </FormSection>;
}
