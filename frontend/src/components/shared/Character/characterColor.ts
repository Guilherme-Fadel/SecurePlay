/**
 * Cor base do personagem: as cinco opções grátis do aluno, na mesma paleta e
 * ordem dos avatares do Ranking. O backend é quem guarda e valida a escolha.
 */
export type CharacterColor = 'azul' | 'laranja' | 'rosa' | 'preto' | 'vermelho';

export const CHARACTER_COLORS: ReadonlyArray<{ color: CharacterColor; label: string; css: string }> = [
  { color: 'azul', label: 'Azul', css: 'var(--sp-blue)' },
  { color: 'laranja', label: 'Laranja', css: 'var(--sp-orange)' },
  { color: 'rosa', label: 'Rosa', css: 'var(--sp-pink)' },
  { color: 'preto', label: 'Preto', css: 'var(--sp-black)' },
  { color: 'vermelho', label: 'Vermelho', css: 'var(--sp-red)' },
];

export const DEFAULT_CHARACTER_COLOR: CharacterColor = 'azul';

const CSS_BY_COLOR = new Map<string, string>(CHARACTER_COLORS.map((entry) => [entry.color, entry.css]));

/** Valor CSS da cor base; valor desconhecido (API nova ou antiga) cai no azul. */
export function characterColorCss(color: CharacterColor | null | undefined): string {
  return (color && CSS_BY_COLOR.get(color)) || CHARACTER_COLORS[0].css;
}

/** Cor do corpo no ranking: a escolhida pelo aluno (`look.bodyColor`) ou, sem ela, a de reserva. */
export function bodyColorOrFallback(look: { bodyColor?: CharacterColor | null } | null | undefined, fallback: string): string {
  const color = look?.bodyColor;
  return color && CSS_BY_COLOR.has(color) ? characterColorCss(color) : fallback;
}

export function characterColorLabel(color: CharacterColor): string {
  return CHARACTER_COLORS.find((entry) => entry.color === color)?.label ?? color;
}
