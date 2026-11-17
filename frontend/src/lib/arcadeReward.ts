import type { SubmitRunResponse } from '@/services/arcade';

/**
 * Aviso de XP reduzido no resultado do jogo. Regra do servidor: 1ª partida do dia 100%,
 * 2ª 50%, 3ª 25% e, da 4ª em diante, 0 XP (o jogo continua liberado para treinar).
 */
export function arcadeRewardNote(
  result: Pick<SubmitRunResponse, 'multiplier' | 'playsToday' | 'xpBase'>,
  withBase = false,
): string | undefined {
  if (result.multiplier >= 1) return undefined;
  if (result.multiplier <= 0) {
    return `${result.playsToday}ª partida hoje: a partir da 4ª o jogo não rende XP, mas continua liberado para treinar.`;
  }
  const base = withBase ? ` da base de ${result.xpBase}` : '';
  return `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}%${base}.`;
}
