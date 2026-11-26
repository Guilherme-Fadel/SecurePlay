import { CARD_THEMES, STAGE_THEMES } from '@/components/sections/HomePage/Awards/characterModel';
import { hasLibraryArt } from '@/components/shared/Character/characterArt';
import { isSafeArtUrl, type CharacterSlot } from '@/components/shared/Character/characterLook';
import type { CharacterLook, LookPiece } from '@/services/dashboard';

const LEGACY_BACKGROUND = /^background-[a-z0-9-]+$/;
const CHARACTER_SLOTS: readonly CharacterSlot[] = ['skin', 'head', 'face', 'neck', 'effect'];

/** A peça aparece na prévia: arte enviada ou valor que a biblioteca (avatar, palco ou card) sabe desenhar. */
function pieceShows(slot: Exclude<keyof CharacterLook, 'bodyColor'>, piece: LookPiece | undefined): boolean {
  if (!piece) return false;
  if (isSafeArtUrl(piece.artUrl)) return true;
  if (slot === 'background') return STAGE_THEMES.includes(piece.visualValue) || LEGACY_BACKGROUND.test(piece.visualValue);
  if (slot === 'card') return CARD_THEMES.includes(piece.visualValue);
  return hasLibraryArt(slot, piece.visualValue);
}

/** Verdadeiro quando alguma peça da prévia tem arte ou valor conhecido da biblioteca; só então o aviso "envie a arte" some. */
export function previewHasVisual(look: CharacterLook): boolean {
  return [...CHARACTER_SLOTS, 'background' as const, 'card' as const].some((slot) => pieceShows(slot, look[slot]));
}
