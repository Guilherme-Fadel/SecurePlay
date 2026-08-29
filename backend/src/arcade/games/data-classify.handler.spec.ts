import { DataClassifyHandler } from './data-classify.handler';
import { DataItem, DataLevel } from '../entities/data-item.entity';
class TestDataHandler extends DataClassifyHandler {
  public fixture: DataItem[] = [];
  protected async pickItems(): Promise<DataItem[]> {
    return this.fixture;
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
    handler = new TestDataHandler({} as any);
  });
  it('nao expoe correct_level no payload', async () => {
    handler.fixture = [item(1, DataLevel.SECRETO)];
    const run = await handler.buildRun();
    const payload = run.payload as {
      items: any[];
    };
    for (const it of payload.items) {
      expect(it).not.toHaveProperty('correct_level');
      expect(it).not.toHaveProperty('correctLevel');
    }
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
