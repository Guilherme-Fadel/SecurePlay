import { BRAND_CHARACTER_BODY } from '@/components/shared/BrandCharacter';
import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import { isSafeArtUrl, type CharacterLook, type LookPiece } from '@/components/shared/Character/characterLook';
import { cn } from '@/lib/utils';
import type { CosmeticType, LegacyCosmeticType } from '@/services/achievements';
import { CosmeticArt, hasCosmeticArtwork } from './CollectiblesArt';
import { cardTheme, isCharacterSlot, stageTheme } from './characterModel';
import { PieceArtThumb } from './PieceArtThumb';
import '@/styles/character-thumb.css';

export interface ThumbSource {
  slug?: string;
  name: string;
  /** Itens antigos (moldura, título, emblema) só chegam pelo console admin e viram a inicial do nome. */
  type: CosmeticType | LegacyCosmeticType;
  visualValue: string;
  artUrl: string | null;
  adjust: LookPiece['adjust'];
  layer: LookPiece['layer'];
  color?: string | null;
}

/** A peça da miniatura, com o ajuste e a camada que o backend enviou para ela. */
function pieceOf(source: ThumbSource): LookPiece {
  return { visualValue: source.visualValue, artUrl: source.artUrl, color: source.color ?? null, adjust: source.adjust, layer: source.layer };
}

/**
 * Miniatura de um item: encaixe do personagem desenhado só com a peça, amostra do
 * fundo ou do tema do card. Itens antigos do catálogo mantêm a pixel art aprovada.
 */
export function CharacterThumb({ source, size = 64 }: { source: ThumbSource; size?: number }) {
  if (!source.artUrl && source.slug && hasCosmeticArtwork(source.slug)) {
    return <CosmeticArt slug={source.slug} name={source.name} size={size} />;
  }
  const piece = pieceOf(source);
  if (source.type === 'background') {
    const theme = stageTheme(piece);
    return <span className={cn('chr-thumb chr-thumb--swatch', theme.className)} style={theme.style} aria-hidden="true" />;
  }
  if (source.type === 'card') {
    const theme = cardTheme(piece);
    // Faixa 8:1 com a arte inteira (degradê à esquerda, cena à direita) e o "Você" de uma linha de placar.
    return <span className={cn('chr-thumb chr-thumb--strip', theme.className)} style={theme.style} aria-hidden="true">Você</span>;
  }
  if (isCharacterSlot(source.type)) {
    const look: CharacterLook = {};
    look[source.type] = piece;
    const worn = (
      <span className="chr-thumb chr-thumb--pet" aria-hidden="true">
        <CharacterAvatar look={look} color={BRAND_CHARACTER_BODY} variant={source.type === 'effect' ? 'full' : 'compact'} />
      </span>
    );
    // Arte enviada: só o acessório recortado; se não der para medir, o personagem vestindo a peça.
    return source.artUrl && isSafeArtUrl(source.artUrl) ? <PieceArtThumb artUrl={source.artUrl} fallback={worn} /> : worn;
  }
  return <CosmeticArt slug={source.slug ?? source.visualValue} name={source.name} size={size} />;
}
