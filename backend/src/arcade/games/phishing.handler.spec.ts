import { PhishingHandler } from './phishing.handler';
import {
  PhishingSample,
  PhishingKind,
  PhishingDifficulty,
} from '../entities/phishing-sample.entity';
import { Repository } from 'typeorm';
class TestPhishingHandler extends PhishingHandler {
  public fixture: PhishingSample[] = [];
  protected pickSamples(): Promise<PhishingSample[]> {
    return Promise.resolve(this.fixture);
  }
}
function sample(
  id: number,
  isPhishing: boolean,
  signals: string[],
): PhishingSample {
  return {
    id,
    kind: PhishingKind.EMAIL,
    content: { body: 'x' },
    is_phishing: isPhishing,
    signals,
    explanation: 'motivo',
    difficulty: PhishingDifficulty.INICIANTE,
    active: true,
  } as PhishingSample;
}
describe('PhishingHandler', () => {
  let handler: TestPhishingHandler;
  beforeEach(() => {
    handler = new TestPhishingHandler({} as Repository<PhishingSample>);
  });
  it('nao expoe is_phishing/signals no payload', async () => {
    handler.fixture = [sample(1, true, ['url'])];
    const run = await handler.buildRun();
    const payload = run.payload as {
      samples: Array<{ id: number; content: Record<string, unknown> }>;
    };
    for (const s of payload.samples) {
      expect(s).not.toHaveProperty('is_phishing');
      expect(s).not.toHaveProperty('signals');
    }
  });
  it('decisao correta + sinais corretos = 100%', async () => {
    handler.fixture = [sample(1, true, ['url', 'urgency'])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      phishingAnswers: [
        { sampleId: 1, report: true, signals: ['url', 'urgency'] },
      ],
    });
    expect(result.score).toBe(100);
  });
  it('amostra legitima: acerta ao confiar e nao marcar sinais', async () => {
    handler.fixture = [sample(1, false, [])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      phishingAnswers: [{ sampleId: 1, report: false, signals: [] }],
    });
    expect(result.score).toBe(100);
  });
  it('usa somente conteúdo e explicação persistidos no banco', async () => {
    const persisted = sample(12, false, []);
    persisted.content = {
      sender: 'rh@suaempresa.com.br',
      subject: 'Holerite de referencia disponivel',
      body: 'Ola, seu holerite deste mes ja esta disponivel no portal interno.',
    };
    persisted.explanation = 'Explicação persistida pela escola.';
    const query = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([persisted]),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
    };
    const dbHandler = new PhishingHandler(
      repository as unknown as Repository<PhishingSample>,
    );

    const run = await dbHandler.buildRun();
    const payload = run.payload as {
      samples: Array<{
        id: number;
        kind: PhishingKind;
        content: Record<string, unknown>;
      }>;
    };
    expect(repository.createQueryBuilder).toHaveBeenCalledWith('s');
    expect(query.where).toHaveBeenCalledWith('s.active = :active', {
      active: true,
    });
    expect(payload.samples).toEqual([
      { id: 12, kind: PhishingKind.EMAIL, content: persisted.content },
    ]);

    const result = dbHandler.correct(run.answerKey, {
      phishingAnswers: [{ sampleId: 12, report: false, signals: [] }],
    });
    const feedback = result.feedback as {
      items: Array<{ explanation: string }>;
    };
    expect(feedback.items[0].explanation).toBe(persisted.explanation);
  });
  it('marcar sinal extra em amostra legitima nao afeta a pontuacao', async () => {
    handler.fixture = [sample(1, false, [])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      phishingAnswers: [{ sampleId: 1, report: false, signals: ['url'] }],
    });
    expect(result.score).toBe(100);
    const feedback = result.feedback as {
      items: Array<{ decisionRight: boolean }>;
    };
    expect(feedback.items[0].decisionRight).toBe(true);
  });
  it('decisao correta com sinais errados/extras = credito integral', async () => {
    handler.fixture = [sample(1, true, ['url', 'urgency'])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      phishingAnswers: [
        { sampleId: 1, report: true, signals: ['url', 'reward', 'spelling'] },
      ],
    });
    expect(result.score).toBe(100);
    expect(result.feedback).toMatchObject({
      total: 1,
      points: 1,
      maxPoints: 1,
    });
  });
  it('decisao correta sem nenhum sinal = credito integral', async () => {
    handler.fixture = [sample(1, true, ['url', 'urgency'])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      phishingAnswers: [{ sampleId: 1, report: true, signals: [] }],
    });
    expect(result.score).toBe(100);
  });
  it('decisao errada com sinais perfeitos = nenhum credito', async () => {
    handler.fixture = [sample(1, true, ['url', 'urgency'])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      phishingAnswers: [
        { sampleId: 1, report: false, signals: ['url', 'urgency'] },
      ],
    });
    expect(result.score).toBe(0);
    const feedback = result.feedback as {
      points: number;
      items: Array<{ decisionRight: boolean }>;
    };
    expect(feedback.points).toBe(0);
    expect(feedback.items[0].decisionRight).toBe(false);
  });
  it('rodada mista: so as decisoes contam, sinais so aparecem no feedback', async () => {
    handler.fixture = [
      sample(1, true, ['url']),
      sample(2, false, []),
      sample(3, true, ['sender', 'reward']),
      sample(4, false, []),
      sample(5, true, ['attachment']),
    ];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      phishingAnswers: [
        { sampleId: 1, report: true, signals: ['spelling'] }, // certo, sinal errado
        { sampleId: 2, report: false, signals: ['url'] }, // certo, sinal extra
        { sampleId: 3, report: true, signals: [] }, // certo, sem sinais
        { sampleId: 4, report: true, signals: [] }, // errado
        { sampleId: 5, report: false, signals: ['attachment'] }, // errado, sinal perfeito
      ],
    });
    expect(result.score).toBe(60);
    const feedback = result.feedback as {
      total: number;
      points: number;
      maxPoints: number;
      items: Array<{
        sampleId: number;
        isPhishing: boolean;
        correctSignals: string[];
        decisionRight: boolean;
        explanation: string;
      }>;
    };
    expect(feedback).toMatchObject({ total: 5, points: 3, maxPoints: 5 });
    expect(feedback.items.map((i) => i.decisionRight)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(feedback.items[2].correctSignals).toEqual(['sender', 'reward']);
    expect(feedback.items[2].isPhishing).toBe(true);
    expect(feedback.items[2].explanation).toBe('motivo');
  });
  it('amostra sem resposta conta como erro total', async () => {
    handler.fixture = [sample(1, true, ['url'])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, { phishingAnswers: [] });
    expect(result.score).toBe(0);
  });
});
