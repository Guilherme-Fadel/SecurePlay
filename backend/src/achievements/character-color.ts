/** Cores base do corpo do personagem. A ordem é contrato com o front (paleta do ranking). */
export const CHARACTER_COLORS = [
  'azul',
  'laranja',
  'rosa',
  'preto',
  'vermelho',
] as const;

export type CharacterColor = (typeof CHARACTER_COLORS)[number];

export const isCharacterColor = (value: unknown): value is CharacterColor =>
  typeof value === 'string' &&
  (CHARACTER_COLORS as readonly string[]).includes(value);

/** Cor de quem ainda não escolheu: hash determinístico da rankKey (igual ao do front). */
export function defaultCharacterColor(rankKey: string): CharacterColor {
  let hash = 0;
  for (const char of rankKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CHARACTER_COLORS[hash % CHARACTER_COLORS.length];
}

/** Cor gravada (se válida) ou a padrão da rankKey. */
export function resolveCharacterColor(
  stored: string | null | undefined,
  rankKey: string,
): { color: CharacterColor; chosen: boolean } {
  return isCharacterColor(stored)
    ? { color: stored, chosen: true }
    : { color: defaultCharacterColor(rankKey), chosen: false };
}
