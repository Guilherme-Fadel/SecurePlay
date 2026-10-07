import { DataClassifyHandler } from './data-classify.handler';
import { DataItem, DataLevel } from '../entities/data-item.entity';
import { Repository } from 'typeorm';
class TestDataHandler extends DataClassifyHandler {
  public fixture: DataItem[] = [];
  protected pickItems(): Promise<DataItem[]> {
    return Promise.resolve(this.fixture);
  }
}
function item(id: number, level: DataLevel): DataItem {
  return {
    id,
    label: `Item ${id}`,
    correct_level: level,
    explanation: 'motivo',
    active: true,
  } as DataItem;
}
describe('DataClassifyHandler', () => {
  let handler: TestDataHandler;
  beforeEach(() => {
    handler = new TestDataHandler({} as Repository<DataItem>);
  });
  it('nao expoe correct_level no payload', async () => {
    handler.fixture = [item(1, DataLevel.SECRETO)];
    const run = await handler.buildRun();
    const payload = run.payload as {
      items: Array<{ id: number; label: string }>;
    };
    for (const it of payload.items) {
      expect(it).not.toHaveProperty('correct_level');
      expect(it).not.toHaveProperty('correctLevel');
    }
  });
  it('apresenta exemplos legados para crianças no enunciado e no feedback', async () => {
    const legacy = item(41, DataLevel.SECRETO);
    legacy.label = 'Senha de acesso ao servidor de producao';
    legacy.explanation =
      'Credencial critica; vazamento compromete todo o sistema.';
    const custom = item(42, DataLevel.CONFIDENCIAL);
    custom.label = 'Desenho com o nome do colega';
    const customizedExplanation = item(43, DataLevel.SECRETO);
    customizedExplanation.label = legacy.label;
    customizedExplanation.explanation = 'Explicação criada pela escola.';
    const customizedLevel = item(44, DataLevel.INTERNO);
    customizedLevel.label = legacy.label;
    customizedLevel.explanation = legacy.explanation;
    handler.fixture = [legacy, custom, customizedExplanation, customizedLevel];

    const run = await handler.buildRun();
    const payload = run.payload as {
      levels: string[];
      items: Array<{ id: number; label: string }>;
    };
    expect(payload.items).toEqual([
      { id: 41, label: 'Senha secreta do baú da equipe' },
      { id: 42, label: 'Desenho com o nome do colega' },
      { id: 43, label: legacy.label },
      { id: 44, label: legacy.label },
    ]);
    expect(payload.levels).toContain(DataLevel.SECRETO);
    expect(payload.items[0]).not.toHaveProperty('correct_level');

    const result = handler.correct(run.answerKey, {
      dataAnswers: [{ itemId: 41, level: DataLevel.SECRETO }],
    });
    expect(result.score).toBe(25);
    const feedback = result.feedback as {
      items: Array<{
        itemId: number;
        label: string;
        correctLevel: DataLevel;
        correct: boolean;
        explanation: string;
      }>;
    };
    expect(feedback.items[0]).toMatchObject({
      itemId: 41,
      label: 'Senha secreta do baú da equipe',
      correctLevel: DataLevel.SECRETO,
      correct: true,
      explanation: 'Uma senha deve ficar em segredo e nunca ser compartilhada.',
    });
    expect(feedback.items[1].label).toBe(custom.label);
    expect(feedback.items[2].explanation).toBe(
      'Explicação criada pela escola.',
    );
  });
  it('todas corretas = 100%', async () => {
    handler.fixture = [item(1, DataLevel.PUBLICO), item(2, DataLevel.SECRETO)];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      dataAnswers: [
        { itemId: 1, level: 'publico' },
        { itemId: 2, level: 'secreto' },
      ],
    });
    expect(result.score).toBe(100);
  });
  it('conta acertos parciais', async () => {
    handler.fixture = [
      item(1, DataLevel.PUBLICO),
      item(2, DataLevel.SECRETO),
      item(3, DataLevel.INTERNO),
      item(4, DataLevel.CONFIDENCIAL),
    ];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, {
      dataAnswers: [
        { itemId: 1, level: 'publico' },
        { itemId: 2, level: 'interno' },
        { itemId: 3, level: 'interno' },
      ],
    });
    const fb = result.feedback as {
      correctCount: number;
      total: number;
    };
    expect(fb.correctCount).toBe(2);
    expect(fb.total).toBe(4);
    expect(result.score).toBe(50);
  });
  it('item nao respondido conta como erro', async () => {
    handler.fixture = [item(1, DataLevel.SECRETO)];
    const run = await handler.buildRun();
    const result = handler.correct(run.answerKey, { dataAnswers: [] });
    expect(result.score).toBe(0);
  });
});
