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
  it('marcar sinal extra em amostra legitima erra a parte de sinais', async () => {
    handler.fixture = [sample(1, false, [])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      phishingAnswers: [{ sampleId: 1, report: false, signals: ['url'] }],
    });
    expect(result.score).toBe(50);
  });
  it('amostra sem resposta conta como erro total', async () => {
    handler.fixture = [sample(1, true, ['url'])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, { phishingAnswers: [] });
    expect(result.score).toBe(0);
  });
});
