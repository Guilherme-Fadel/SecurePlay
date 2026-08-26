import { QuizRelampagoHandler } from './quiz-relampago.handler';
import { Question } from '../../question/question.entity';

// Subclasse de teste: injeta perguntas fixas em vez de sortear do banco.
class TestQuizHandler extends QuizRelampagoHandler {
  public fixture: Question[] = [];
  protected async pickQuestions(): Promise<Question[]> {
    return this.fixture;
  }
}

function makeQuestion(id: number, correctIndex: number): Question {
  return {
    id,
    text: `Pergunta ${id}`,
    options: ['a', 'b', 'c', 'd'],
    correct_index: correctIndex,
    challenge_id: 0,
    explanation: '',
    order: 0,
  } as Question;
}

describe('QuizRelampagoHandler', () => {
  let handler: TestQuizHandler;

  beforeEach(() => {
    handler = new TestQuizHandler({} as any);
  });

  it('nao expoe correct_index no payload da partida', async () => {
    handler.fixture = [makeQuestion(1, 2), makeQuestion(2, 0)];
    const run = await handler.buildRun();
    const payload = run.payload as { questions: any[] };
    for (const q of payload.questions) {
      expect(q).not.toHaveProperty('correct_index');
      expect(q).not.toHaveProperty('correctIndex');
    }
  });

  it('todas corretas resultam em score 100 (com combo limitado a 100)', async () => {
    handler.fixture = [makeQuestion(1, 1), makeQuestion(2, 2)];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      quizAnswers: [
        { questionId: 1, selectedIndex: 1 },
        { questionId: 2, selectedIndex: 2 },
      ],
    });
    expect(result.score).toBe(100);
  });

  it('conta acertos parciais e trata nao respondida como erro', async () => {
    handler.fixture = [
      makeQuestion(1, 1),
      makeQuestion(2, 2),
      makeQuestion(3, 3),
      makeQuestion(4, 0),
    ];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      quizAnswers: [
        { questionId: 1, selectedIndex: 1 }, // certo
        { questionId: 2, selectedIndex: 0 }, // errado
        // 3 nao respondida -> erro
        { questionId: 4, selectedIndex: 0 }, // certo
      ],
    });
    const fb = result.feedback as { correctCount: number; total: number };
    expect(fb.correctCount).toBe(2);
    expect(fb.total).toBe(4);
    expect(result.score).toBeGreaterThan(0);
  });

  it('pergunta respondida que nao existe na run e ignorada (nao pontua)', async () => {
    handler.fixture = [makeQuestion(1, 1)];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      quizAnswers: [
        { questionId: 999, selectedIndex: 1 }, // nao pertence a run
      ],
    });
    const fb = result.feedback as { correctCount: number };
    expect(fb.correctCount).toBe(0);
    expect(result.score).toBe(0);
  });
});
