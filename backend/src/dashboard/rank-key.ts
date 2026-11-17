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
