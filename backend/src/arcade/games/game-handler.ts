import { SubmitRunDto } from '../dto/arcade.dto';

/**
 * Contrato comum dos jogos do arcade. Cada game_type implementa um handler.
 *
 * - buildRun: monta a partida no servidor. Retorna `payload` (enviado ao cliente,
 *   SEM gabarito) e `answerKey` (guardado apenas no Redis do lado servidor).
 * - correct: corrige o submit contra o answerKey e retorna score (0..100) + feedback.
 */
export interface GameRun {
  payload: unknown; // vai para o cliente (sem gabarito)
  answerKey: unknown; // fica no servidor (arcade-run)
}

export interface GameCorrection {
  score: number; // 0..100
  feedback: unknown; // detalhe por item/pergunta para exibir apos submit
}

export interface GameHandler {
  buildRun(): Promise<GameRun>;
  correct(answerKey: unknown, dto: SubmitRunDto): GameCorrection;
}
