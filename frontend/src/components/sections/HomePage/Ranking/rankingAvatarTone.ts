/**
 * Avatares do Ranking (sem dependências de runtime, testável em Node): cor das
 * iniciais por id e a sua foto do perfil nas suas linhas sem foto.
 */
import type { RankingData, RankingEntry } from '@/services/dashboard';

export interface AvatarTone { background: string; color: string }

/**
 * Fundo das iniciais (aluno sem foto) pela paleta fixa da marca, com texto em
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

/** Cor determinística pelo id do usuário: o mesmo aluno tem sempre a mesma cor. */
export function avatarTone(id: number, me: boolean): AvatarTone {
  if (me) return MY_TONE;
  const index = Math.abs(Math.trunc(Number.isFinite(id) ? id : 0)) % AVATAR_TONES.length;
  return AVATAR_TONES[index] ?? MY_TONE;
}

function fillPhoto(entry: RankingEntry, viewerId: number | null, photo: string): RankingEntry {
  if (entry.profileImageUrl) return entry;
  const mine = entry.isCurrentUser === true || (viewerId !== null && entry.id === viewerId);
  return mine ? { ...entry, profileImageUrl: photo } : entry;
}

/**
 * Completa a foto das suas linhas com a foto do perfil logado quando o ranking
 * a envia vazia. Só a foto: posição, XP e participação seguem como vieram.
 */
export function withViewerPhoto(ranking: RankingData, photo: string | null | undefined): RankingData {
  const url = photo?.trim();
  if (!url) return ranking;
  const viewerId = ranking.currentUser?.id ?? null;
  const fill = (entry: RankingEntry) => fillPhoto(entry, viewerId, url);
  return {
    ...ranking,
    top: ranking.top.map(fill),
    leaderboard: ranking.leaderboard.map(fill),
    currentUser: ranking.currentUser ? fill(ranking.currentUser) : null,
    weeklyHighlights: ranking.weeklyHighlights?.map((item) => ({ ...item, user: fill(item.user) })),
  };
}
