import { ModuloService } from './modulo.service';

describe('ModuloService journey summary', () => {
  let service: ModuloService;

  beforeEach(() => {
    service = new ModuloService(
      {} as never,
      {} as never,
      {} as never,
      { resolveImageUrl: jest.fn() } as never,
    );
  });

  const moduleAt = (
    id: number,
    overrides: Record<string, unknown> = {},
  ) => ({
    id,
    title: `Módulo ${id}`,
    description: '',
    thumbnail: null,
    artworkUrl: null,
    type: 'misto',
    category: 'Segurança',
    difficulty: 'iniciante',
    xp_total: 100,
    xp_bonus: 0,
    order: id,
    active: true,
    created_at: new Date(0),
    totalAulas: 4,
    completedAulas: 0,
    progress: 0,
    hasStarted: false,
    lastAccessedAt: null,
    nextAulaId: id * 10,
    ...overrides,
  });

  it.each([0, 1, 4, 6, 20, 50])(
    'keeps the journey data-driven with %i modules',
    async (size) => {
      jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(Array.from({ length: size }, (_, index) => moduleAt(index + 1)) as never);

      const result = await service.getJourneySummary(7);

      expect(result.summary.totalModules).toBe(size);
      expect(result.stages.flatMap((stage) => stage.nodes)).toHaveLength(size);
      expect(result.currentModuleId).toBe(size > 0 ? 1 : null);
    },
  );

  it('selects the most recently accessed started and incomplete module', async () => {
    jest.spyOn(service, 'findAll').mockResolvedValue([
      moduleAt(1, { hasStarted: true, lastAccessedAt: new Date('2026-09-01') }),
      moduleAt(2, { hasStarted: true, progress: 50, completedAulas: 2, lastAccessedAt: new Date('2026-09-03') }),
      moduleAt(3),
    ] as never);

    const result = await service.getJourneySummary(7);

    expect(result.currentModuleId).toBe(2);
    expect(result.summary.completedLessons).toBe(2);
    expect(result.summary.progressPercent).toBe(17);
  });

  it('uses the last module when every module is complete', async () => {
    jest.spyOn(service, 'findAll').mockResolvedValue([
      moduleAt(10, { progress: 100, completedAulas: 4, order: 1 }),
      moduleAt(20, { progress: 100, completedAulas: 4, order: 2 }),
    ] as never);

    const result = await service.getJourneySummary(7);

    expect(result.currentModuleId).toBe(20);
    expect(result.summary.progressPercent).toBe(100);
  });

  it('returns stages as data and preserves the stable global position', async () => {
    jest.spyOn(service, 'findAll').mockResolvedValue([
      moduleAt(1, { difficulty: 'iniciante' }),
      moduleAt(2, { difficulty: 'intermediario' }),
      moduleAt(3, { difficulty: 'intermediario' }),
      moduleAt(4, { difficulty: 'avancado' }),
    ] as never);

    const result = await service.getJourneySummary(7);
    const positions = result.stages
      .flatMap((stage) => stage.nodes)
      .map((node) => node.globalPosition);

    expect(result.stages.map((stage) => stage.key)).toEqual([
      'iniciante',
      'intermediario',
      'avancado',
    ]);
    expect(positions).toEqual([1, 2, 3, 4]);
  });
});
