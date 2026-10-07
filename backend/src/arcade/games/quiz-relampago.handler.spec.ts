import { QuizRelampagoHandler } from './quiz-relampago.handler';
import { Question } from '../../question/question.entity';
import { Repository } from 'typeorm';
class TestQuizHandler extends QuizRelampagoHandler {
  public fixture: Question[] = [];
  protected pickQuestions(): Promise<Question[]> {
    return Promise.resolve(this.fixture);
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
    handler = new TestQuizHandler({} as Repository<Question>);
  });
  it('nao expoe correct_index no payload da partida', async () => {
    handler.fixture = [makeQuestion(1, 2), makeQuestion(2, 0)];
    const run = await handler.buildRun();
    const payload = run.payload as {
      questions: Array<{ id: number; text: string; options: string[] }>;
    };
    for (const q of payload.questions) {
      expect(q).not.toHaveProperty('correct_index');
      expect(q).not.toHaveProperty('correctIndex');
    }
  });
  it('adapta pergunta legada preservando ordem das alternativas e resposta correta', async () => {
    const legacy = makeQuestion(40, 1);
    legacy.text = 'O que MFA adiciona a autenticacao?';
    legacy.options = [
      'Mais senhas',
      'Uma camada extra de verificacao',
      'Menos seguranca',
      'Nada',
    ];
    const custom = makeQuestion(41, 2);
    custom.text = 'Como proteger seu desenho?';
    const customizedLegacy = makeQuestion(42, 0);
    customizedLegacy.text = legacy.text;
    customizedLegacy.options = [...legacy.options];
    handler.fixture = [legacy, custom, customizedLegacy];

    const run = await handler.buildRun();
    const payload = run.payload as {
      questions: Array<{ id: number; text: string; options: string[] }>;
    };
    expect(payload.questions[0]).toEqual({
      id: 40,
      text: 'O que ajuda a proteger uma conta além da senha?',
      options: [
        'Mais senhas',
        'Uma etapa extra de confirmação',
        'Menos segurança',
        'Nada',
      ],
    });
    expect(payload.questions[0]).not.toHaveProperty('correct_index');
    expect(payload.questions[1].text).toBe(custom.text);
    expect(payload.questions[2].text).toBe(legacy.text);
    expect(payload.questions[2].options).toEqual(legacy.options);

    const result = handler.correct(run.answerKey, {
      quizAnswers: [{ questionId: 40, selectedIndex: 1 }],
    });
    const feedback = result.feedback as {
      items: Array<{
        questionId: number;
        correct: boolean;
        correctIndex: number;
      }>;
    };
    expect(feedback.items[0]).toMatchObject({
      questionId: 40,
      correct: true,
      correctIndex: 1,
    });
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
        { questionId: 1, selectedIndex: 1 },
        { questionId: 2, selectedIndex: 0 },
        { questionId: 4, selectedIndex: 0 },
      ],
    });
    const fb = result.feedback as {
      correctCount: number;
      total: number;
    };
    expect(fb.correctCount).toBe(2);
    expect(fb.total).toBe(4);
    expect(result.score).toBeGreaterThan(0);
  });
  it('pergunta respondida que nao existe na run e ignorada (nao pontua)', async () => {
    handler.fixture = [makeQuestion(1, 1)];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      quizAnswers: [{ questionId: 999, selectedIndex: 1 }],
    });
    const fb = result.feedback as {
      correctCount: number;
    };
    expect(fb.correctCount).toBe(0);
    expect(result.score).toBe(0);
  });
});
