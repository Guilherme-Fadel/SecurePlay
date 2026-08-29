import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Question } from '../../question/question.entity';
import { GameHandler, GameRun, GameCorrection } from './game-handler';
import { SubmitRunDto } from '../dto/arcade.dto';
const QUIZ_SIZE = 8;
const COMBO_BONUS_PER_STREAK = 2;
interface QuizAnswerKey {
  correct: Record<number, number>;
  order: number[];
}
@Injectable()
export class QuizRelampagoHandler implements GameHandler {
  constructor(
    @Inject('QUESTION_REPOSITORY')
    private readonly questionRepository: Repository<Question>,
  ) {}
  protected async pickQuestions(size: number): Promise<Question[]> {
    return this.questionRepository
      .createQueryBuilder('q')
      .orderBy('RAND()')
      .limit(size)
      .getMany();
  }
  async buildRun(): Promise<GameRun> {
    const questions = await this.pickQuestions(QUIZ_SIZE);
    const correct: Record<number, number> = {};
    const order: number[] = [];
    for (const q of questions) {
      correct[q.id] = q.correct_index;
      order.push(q.id);
    }
    const payload = {
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
      })),
    };
    const answerKey: QuizAnswerKey = { correct, order };
    return { payload, answerKey };
  }
  correct(answerKey: unknown, dto: SubmitRunDto): GameCorrection {
    const key = answerKey as QuizAnswerKey;
    const answers = dto.quizAnswers ?? [];
    const byId = new Map(answers.map((a) => [a.questionId, a.selectedIndex]));
    const total = key.order.length;
    let correctCount = 0;
    let combo = 0;
    let comboBonus = 0;
    const items = key.order.map((qid) => {
      const correctIndex = key.correct[qid];
      const selected = byId.get(qid);
      const isCorrect = selected !== undefined && selected === correctIndex;
      if (isCorrect) {
        correctCount++;
        combo++;
        comboBonus += combo * COMBO_BONUS_PER_STREAK;
      } else {
        combo = 0;
      }
      return { questionId: qid, correct: isCorrect, correctIndex };
    });
    const base = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const score = Math.min(100, base + comboBonus);
    return { score, feedback: { total, correctCount, comboBonus, items } };
  }
}
