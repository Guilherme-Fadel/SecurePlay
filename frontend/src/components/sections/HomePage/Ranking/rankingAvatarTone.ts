/** Cor de reserva dos avatares do Ranking (sem dependências de runtime, testável em Node), por id. */
export interface AvatarTone { background: string; color: string }

/**
 * Cor de reserva do personagem e fundo do chip da turma pela paleta fixa da marca, com texto em
 * contraste AA (≥ 4,5:1): branco só sobre o azul; preto sobre laranja, rosa e
 * vermelho; creme sobre o preto. O seu avatar é o amarelo, o mesmo do trilho.
 */
const AVATAR_TONES: AvatarTone[] = [
  { background: 'var(--sp-blue)', color: '#FFFFFF' },
  { background: 'var(--sp-orange)', color: 'var(--sp-black)' },
  { background: 'var(--sp-pink)', color: 'var(--sp-black)' },
  { background: 'var(--sp-black)', color: 'var(--sp-cream)' },
  { background: 'var(--sp-red)', color: 'var(--sp-black)' },
];
const MY_TONE: AvatarTone = { background: 'var(--sp-yellow)', color: 'var(--sp-black)' };

/** Cor determinística pela chave do ranking: o mesmo aluno tem sempre a mesma cor. */
export function avatarTone(rankKey: string, me: boolean): AvatarTone {
  if (me) return MY_TONE;
  let hash = 0;
  for (const char of rankKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length] ?? MY_TONE;
}
