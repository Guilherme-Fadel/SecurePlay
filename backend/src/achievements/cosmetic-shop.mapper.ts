import { CosmeticItem, CosmeticType } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { toLookPiece } from './look';
import { noRequirement } from './unlock-requirements';
import type { UnlockTarget, UnlockView } from './unlock-requirements';

/**
 * Apresentacao do Shop de cosmeticos. Funcoes puras: quem chama consulta os
 * itens, kits, o que o usuario possui, as liberacoes ja avaliadas e as URLs de
 * arte ja resolvidas.
 */
export type ArtUrls = ReadonlyMap<string, string | null>;
export type UnlockViews = ReadonlyMap<UnlockTarget, UnlockView>;

const artOf = (key: string | null | undefined, artUrls: ArtUrls) =>
  key ? (artUrls.get(key) ?? null) : null;

const unlockOf = (target: UnlockTarget, unlocks: UnlockViews): UnlockView =>
  unlocks.get(target) ?? noRequirement();

/** Arte, ajuste e camada para o provador: o mesmo mapeamento do `equipped`. */
const lookOf = (item: CosmeticItem, artUrls: ArtUrls) => {
  const { artUrl, adjust, layer } = toLookPiece(
    item,
    null,
    artOf(item.art_key, artUrls),
  );
  return { artUrl, adjust, layer };
};

const isoOrNull = (date: Date | null) => (date ? date.toISOString() : null);

/** Chaves de arte que a resposta do Shop vai precisar resolver. */
export function collectArtKeys(
  owned: UsuarioCosmetic[],
  items: CosmeticItem[],
  kits: CosmeticKit[],
): string[] {
  const keys = new Set<string>();
  const all = [
    ...owned.map((entry) => entry.cosmetic_item),
    ...items,
    ...kits.flatMap((kit) => kit.pieces),
  ];
  for (const item of all) if (item.art_key) keys.add(item.art_key);
  return [...keys];
}

export function buildEquippedList(owned: UsuarioCosmetic[], artUrls: ArtUrls) {
  return owned
    .filter((entry) => entry.equipped)
    .map(({ cosmetic_item: item, color }) => ({
      type: item.type,
      slug: item.slug,
      ...toLookPiece(item, color, artOf(item.art_key, artUrls)),
    }));
}

export function buildShopItems(params: {
  items: CosmeticItem[];
  ownedByItem: Map<number, UsuarioCosmetic>;
  unlocks: UnlockViews;
  prestigeBalance: number;
  artUrls: ArtUrls;
}) {
  const { items, ownedByItem, unlocks, prestigeBalance, artUrls } = params;
  return items.map((item) => {
    const userItem = ownedByItem.get(item.id);
    const unlock = unlockOf(item, unlocks);
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      type: item.type,
      rarity: item.rarity,
      price: item.price,
      visualValue: item.visual_value,
      ...lookOf(item, artUrls),
      recolorable: item.recolorable,
      festiveEvent: item.festive_event,
      availableUntil: isoOrNull(item.available_until),
      owned: !!userItem,
      equipped: !!userItem?.equipped,
      color: userItem?.color ?? null,
      affordable: prestigeBalance >= item.price,
      unlock,
      // Campos antigos: a tela atual de Colecionaveis ainda os le.
      requiredAchievementSlug: item.required_achievement_slug,
      requirementMet: unlock.met,
    };
  });
}

/** Peça removida do kit (arquivada, com `available_until`) ou inativa não é mostrada na loja. */
const isShopPiece = (piece: CosmeticItem) =>
  piece.active && !piece.available_until;

export function buildShopKits(params: {
  kits: CosmeticKit[];
  ownedKitIds: ReadonlySet<number>;
  ownedItemIds: ReadonlySet<number>;
  unlocks: UnlockViews;
  prestigeBalance: number;
  artUrls: ArtUrls;
}) {
  const { kits, ownedKitIds, ownedItemIds, unlocks, prestigeBalance, artUrls } =
    params;
  return kits.map((kit) => ({
    id: kit.id,
    slug: kit.slug,
    name: kit.name,
    description: kit.description,
    rarity: kit.rarity,
    price: kit.price,
    festiveEvent: kit.festive_event,
    availableUntil: isoOrNull(kit.available_until),
    owned: ownedKitIds.has(kit.id),
    affordable: prestigeBalance >= kit.price,
    unlock: unlockOf(kit, unlocks),
    // Kit do aluno mostra só o que ele tem (peça nova ou arquivada depois da
    // compra não aparece); kit à venda mostra as peças atuais da loja.
    pieces: kit.pieces
      .filter((piece) =>
        ownedKitIds.has(kit.id)
          ? ownedItemIds.has(piece.id)
          : isShopPiece(piece),
      )
      .map((piece) => ({
        id: piece.id,
        type: piece.type,
        name: piece.name,
        visualValue: piece.visual_value,
        recolorable: piece.recolorable,
        ...lookOf(piece, artUrls),
      })),
  }));
}

/** A cor só vale para peça recolorível ou fundo personalizado (`custom`). */
export function acceptsCosmeticColor(item: CosmeticItem): boolean {
  return (
    item.recolorable ||
    (item.type === CosmeticType.BACKGROUND && item.visual_value === 'custom')
  );
}
