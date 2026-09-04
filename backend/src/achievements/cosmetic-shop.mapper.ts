import { CosmeticItem } from './entities/cosmetic-item.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';

/**
 * Apresentacao do Shop de cosmeticos. Funcoes puras: quem chama consulta os
 * itens, o que o usuario possui e as conquistas desbloqueadas.
 */
export function buildEquippedList(owned: UsuarioCosmetic[]) {
  return owned
    .filter((item) => item.equipped)
    .map((item) => ({
      type: item.cosmetic_item.type,
      slug: item.cosmetic_item.slug,
      visualValue: item.cosmetic_item.visual_value,
    }));
}

export function buildShopItems(params: {
  items: CosmeticItem[];
  ownedByItem: Map<number, UsuarioCosmetic>;
  unlockedSlugs: Set<string>;
  prestigeBalance: number;
}) {
  const { items, ownedByItem, unlockedSlugs, prestigeBalance } = params;
  return items.map((item) => {
    const userItem = ownedByItem.get(item.id);
    const requirementMet =
      !item.required_achievement_slug ||
      unlockedSlugs.has(item.required_achievement_slug);
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      type: item.type,
      rarity: item.rarity,
      price: item.price,
      visualValue: item.visual_value,
      requiredAchievementSlug: item.required_achievement_slug,
      requirementMet,
      owned: !!userItem,
      equipped: !!userItem?.equipped,
      affordable: prestigeBalance >= item.price,
    };
  });
}
