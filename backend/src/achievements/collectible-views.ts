import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';

export type ArtResolver = (key: string | null) => Promise<string | null>;

const iso = (date: Date | null) => (date ? date.toISOString() : null);

/** Formato do console: tudo que o formulário de cadastro edita, com a arte já resolvida. */
export async function toItemView(item: CosmeticItem, resolveArt: ArtResolver) {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    type: item.type,
    rarity: item.rarity,
    price: item.price,
    visualValue: item.visual_value,
    kitId: item.kit_id,
    festiveEvent: item.festive_event,
    availableFrom: iso(item.available_from),
    availableUntil: iso(item.available_until),
    unlockRule: item.unlock_rule,
    /** Exigência antiga (conquista): só leitura no console, ainda vale na compra. */
    requiredAchievementSlug: item.required_achievement_slug,
    artKey: item.art_key,
    artUrl: await resolveArt(item.art_key),
    layer: item.layer,
    recolorable: item.recolorable,
    adjust: { x: item.adjust_x, y: item.adjust_y, scale: item.adjust_scale },
    active: item.active,
  };
}

export type CollectibleItemView = Awaited<ReturnType<typeof toItemView>>;

/**
 * Peça removida do kit por PATCH fica arquivada (alunos podem tê-la) e recebe `available_until`:
 * peças de kit nunca têm janela própria, então o campo marca "saiu do kit".
 */
export const isCurrentPiece = (piece: CosmeticItem) => !piece.available_until;

export async function toKitView(
  kit: CosmeticKit,
  pieces: CosmeticItem[],
  resolveArt: ArtResolver,
) {
  const currentPieces = await Promise.all(
    pieces.filter(isCurrentPiece).map((piece) => toItemView(piece, resolveArt)),
  );
  return {
    id: kit.id,
    slug: kit.slug,
    name: kit.name,
    description: kit.description,
    rarity: kit.rarity,
    price: kit.price,
    festiveEvent: kit.festive_event,
    availableFrom: iso(kit.available_from),
    availableUntil: iso(kit.available_until),
    unlockRule: kit.unlock_rule,
    active: kit.active,
    pieces: currentPieces,
  };
}

export type CollectibleKitView = Awaited<ReturnType<typeof toKitView>>;
