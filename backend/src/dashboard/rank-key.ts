import { createHmac } from 'node:crypto';

/**
 * Chave opaca e estável de um aluno no ranking (B8): HMAC-SHA256 do id com segredo do
 * servidor, 16 hex. O id interno sequencial não sai mais na resposta.
 */
export function rankKey(
  usuarioId: number,
  secret = process.env.RANKING_KEY_SECRET || process.env.JWT_SECRET || '',
): string {
  return createHmac('sha256', secret)
    .update(`ranking:${usuarioId}`)
    .digest('hex')
    .slice(0, 16);
}

/** Chave opaca e estável de uma turma no ranking por turmas: o id interno não sai na resposta. */
export function turmaKey(
  turmaId: number,
  secret = process.env.RANKING_KEY_SECRET || process.env.JWT_SECRET || '',
): string {
  return createHmac('sha256', secret)
    .update(`ranking-turma:${turmaId}`)
    .digest('hex')
    .slice(0, 16);
}

/** Prefixo do nome padrão de quem não tem apelido (sem o id interno). */
export const DEFAULT_RANK_NAME = 'Aventureiro';

/** Nome padrão derivado da rankKey: não revela o id sequencial. */
export function defaultRankName(usuarioId: number): string {
  return `${DEFAULT_RANK_NAME} ${rankKey(usuarioId).slice(0, 4).toUpperCase()}`;
}

/**
 * Nome exibido no ranking. Sem apelido, ou com o nome padrão antigo (`Aventureiro <id>`, que
 * ficou gravado em snapshots de temporada), usa o nome derivado da rankKey.
 */
export function rankDisplayName(
  nickname: string | null | undefined,
  usuarioId: number,
): string {
  if (!nickname || /^Aventureiro( \d+)?$/.test(nickname.trim())) {
    return defaultRankName(usuarioId);
  }
  return nickname;
}
