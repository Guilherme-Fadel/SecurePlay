import { PhishingHandler } from './phishing.handler';
import {
  PhishingSample,
  PhishingKind,
} from '../entities/phishing-sample.entity';

class TestPhishingHandler extends PhishingHandler {
  public fixture: PhishingSample[] = [];
  protected async pickSamples(): Promise<PhishingSample[]> {
    return this.fixture;
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
    difficulty: undefined as any,
    active: true,
  } as PhishingSample;
}

describe('PhishingHandler', () => {
  let handler: TestPhishingHandler;

  beforeEach(() => {
    handler = new TestPhishingHandler({} as any);
  });

  it('nao expoe is_phishing/signals no payload', async () => {
    handler.fixture = [sample(1, true, ['url'])];
    const run = await handler.buildRun();
    const payload = run.payload as { samples: any[] };
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

  it('marcar sinal extra em amostra legitima erra a parte de sinais', async () => {
    handler.fixture = [sample(1, false, [])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      phishingAnswers: [{ sampleId: 1, report: false, signals: ['url'] }],
    });
    // acertou decisao (1) mas errou sinais (0) de 2 pontos possiveis
    expect(result.score).toBe(50);
  });

  it('amostra sem resposta conta como erro total', async () => {
    handler.fixture = [sample(1, true, ['url'])];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, { phishingAnswers: [] });
    expect(result.score).toBe(0);
  });
});
