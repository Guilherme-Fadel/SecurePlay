/**
 * Raridade de colecionáveis (itens e kits); `festive` não existe em conquistas, por isso enum
 * próprio. Fica fora das entidades para evitar import circular item <-> kit na avaliação dos decorators.
 */
export enum CosmeticRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  FESTIVE = 'festive',
}
