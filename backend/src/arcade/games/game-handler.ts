import { SubmitRunDto } from '../dto/arcade.dto';
export interface GameRun {
  payload: unknown;
  answerKey: unknown;
}
export interface GameCorrection {
  score: number;
  feedback: unknown;
}
export interface GameHandler {
  buildRun(): Promise<GameRun>;
  correct(answerKey: unknown, dto: SubmitRunDto): GameCorrection;
}
