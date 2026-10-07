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

const LEGACY_QUESTION_PRESENTATION: Array<{
  text: string;
  options: string[];
  correctIndex: number;
  replacement: { text: string; options: string[] };
}> = [
  {
    text: 'Qual senha e mais segura?',
    options: ['senha123', 'P@ssw0rd!2024xY', '12345678', 'qwerty'],
    correctIndex: 1,
    replacement: {
      text: 'Qual senha seria mais difícil de adivinhar no seu jogo de faz de conta?',
      options: [
        'senha123',
        'Uma frase longa e diferente, criada com ajuda de um adulto',
        '12345678',
        'qwerty',
      ],
    },
  },
  {
    text: 'Com que frequencia trocar senhas criticas?',
    options: [
      'Nunca',
      'Periodicamente ou apos incidente',
      'A cada hora',
      'So uma vez',
    ],
    correctIndex: 1,
    replacement: {
      text: 'Se alguém descobrir a senha do seu jogo, o que você deve fazer?',
      options: [
        'Nunca contar a ninguém',
        'Trocar com ajuda de um adulto',
        'Trocar a cada hora',
        'Esperar sem avisar',
      ],
    },
  },
  {
    text: 'O que MFA adiciona a autenticacao?',
    options: [
      'Mais senhas',
      'Uma camada extra de verificacao',
      'Menos seguranca',
      'Nada',
    ],
    correctIndex: 1,
    replacement: {
      text: 'O que ajuda a proteger uma conta além da senha?',
      options: [
        'Mais senhas',
        'Uma etapa extra de confirmação',
        'Menos segurança',
        'Nada',
      ],
    },
  },
];

function presentQuestion(
  question: Question,
): Pick<Question, 'text' | 'options'> {
  const legacy = LEGACY_QUESTION_PRESENTATION.find(
    (entry) =>
      question.text === entry.text &&
      JSON.stringify(question.options) === JSON.stringify(entry.options) &&
      question.correct_index === entry.correctIndex,
  );
  return legacy
    ? legacy.replacement
    : { text: question.text, options: question.options };
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
        ...presentQuestion(q),
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
