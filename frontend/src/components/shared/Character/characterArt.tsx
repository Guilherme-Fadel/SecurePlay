import { createElement } from 'react';
import { GLOW_EFFECTS } from './art/effects';
import { PARTY_EFFECTS } from './art/effectsParty';
import { FACES } from './art/faces';
import { HEADS } from './art/heads';
import { NECKS } from './art/necks';
import { RED, type ArtLibrary } from './art/palette';
import { SKIN_BODY_COLOR, SKIN_NAMES } from './art/skins';
import type { CharacterSlot } from './characterLook';

export { CharacterBody } from './art/skins';

/** Cor das peças recolorizáveis quando a peça não traz outra (a do canvas aprovado). */
export const DEFAULT_PIECE_COLOR = RED;

const LIBRARY: Record<Exclude<CharacterSlot, 'skin'>, ArtLibrary> = {
  head: HEADS,
  face: FACES,
  neck: NECKS,
  effect: { ...GLOW_EFFECTS, ...PARTY_EFFECTS },
};

/** Skin da biblioteca pelo `visualValue`; `undefined` quando o valor não existe nela. */
export function librarySkin(visualValue: string): string | undefined {
  return SKIN_NAMES.includes(visualValue) ? visualValue : undefined;
}

/** Se o encaixe tem arte da biblioteca para o `visualValue` (o avatar desenha algo com ele). */
export function hasLibraryArt(slot: CharacterSlot, visualValue: string): boolean {
  if (slot === 'skin') return librarySkin(visualValue) !== undefined;
  return Object.prototype.hasOwnProperty.call(LIBRARY[slot], visualValue);
}

/** Cor do corpo: algumas skins trocam a cor escolhida por uma própria. */
export function skinBodyColor(skin: string | undefined, fallback: string): string {
  return (skin && SKIN_BODY_COLOR[skin]) || fallback;
}

/** Arte da biblioteca para o encaixe e o `visualValue`; `null` quando não existe. */
export function LibraryArt({ slot, visualValue, uid, color, eye }: {
  slot: CharacterSlot;
  visualValue: string;
  uid: string;
  color: string;
  eye: string;
}) {
  if (slot === 'skin') return null;
  const library = LIBRARY[slot];
  if (!Object.prototype.hasOwnProperty.call(library, visualValue)) return null;
  return createElement(library[visualValue], { uid, color, eye });
}
