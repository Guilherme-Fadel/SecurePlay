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

  const moduleAt = (id: number, overrides: Record<string, unknown> = {}) => ({
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
        .mockResolvedValue(
          Array.from({ length: size }, (_, index) =>
            moduleAt(index + 1),
          ) as never,
        );

      const result = await service.getJourneySummary(7);

      expect(result.summary.totalModules).toBe(size);
      expect(result.stages.flatMap((stage) => stage.nodes)).toHaveLength(size);
      expect(result.currentModuleId).toBe(size > 0 ? 1 : null);
    },
  );

  it('selects the most recently accessed started and incomplete module', async () => {
    jest.spyOn(service, 'findAll').mockResolvedValue([
      moduleAt(1, {
        hasStarted: true,
        lastAccessedAt: new Date('2026-09-01'),
      }),
      moduleAt(2, {
        hasStarted: true,
        progress: 50,
        completedAulas: 2,
        lastAccessedAt: new Date('2026-09-03'),
      }),
      moduleAt(3),
    ] as never);

    const result = await service.getJourneySummary(7);

    expect(result.currentModuleId).toBe(2);
    expect(result.summary.completedLessons).toBe(2);
    expect(result.summary.progressPercent).toBe(17);
  });

  it('uses the last module when every module is complete', async () => {
    jest
      .spyOn(service, 'findAll')
      .mockResolvedValue([
        moduleAt(10, { progress: 100, completedAulas: 4, order: 1 }),
        moduleAt(20, { progress: 100, completedAulas: 4, order: 2 }),
      ] as never);

    const result = await service.getJourneySummary(7);

    expect(result.currentModuleId).toBe(20);
    expect(result.summary.progressPercent).toBe(100);
  });

  it('returns stages as data and preserves the stable global position', async () => {
    jest
      .spyOn(service, 'findAll')
      .mockResolvedValue([
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

describe('ModuloService bloqueio sequencial de modulo', () => {
  let service: ModuloService;

  beforeEach(() => {
    service = new ModuloService(
      {} as never,
      {} as never,
      {} as never,
      { resolveImageUrl: jest.fn() } as never,
    );
  });

  const moduloResumo = (
    id: number,
    overrides: Record<string, unknown> = {},
  ) => ({
    id,
    order: id,
    totalAulas: 4,
    completedAulas: 0,
    progress: 0,
    locked: false,
    ...overrides,
  });

  it('libera o primeiro modulo mesmo sem progresso', async () => {
    jest
      .spyOn(service, 'findAll')
      .mockResolvedValue([
        moduloResumo(1, { locked: false }),
        moduloResumo(2, { locked: true }),
      ] as never);

    await expect(
      service.assertModuloDesbloqueado(1, 7),
    ).resolves.toBeUndefined();
  });

  it('bloqueia o proximo modulo enquanto o anterior nao esta 100%', async () => {
    jest
      .spyOn(service, 'findAll')
      .mockResolvedValue([
        moduloResumo(1, { progress: 50, locked: false }),
        moduloResumo(2, { locked: true }),
      ] as never);

    await expect(service.assertModuloDesbloqueado(2, 7)).rejects.toThrow(
      /bloqueado/i,
    );
  });

  it('libera o proximo modulo quando o anterior esta 100%', async () => {
    jest
      .spyOn(service, 'findAll')
      .mockResolvedValue([
        moduloResumo(1, { progress: 100, completedAulas: 4, locked: false }),
        moduloResumo(2, { locked: false }),
      ] as never);

    await expect(
      service.assertModuloDesbloqueado(2, 7),
    ).resolves.toBeUndefined();
  });
});

describe('ModuloService findAll calcula locked', () => {
  const buildService = (
    modulos: Array<Record<string, unknown>>,
    aulas: Array<Record<string, unknown>>,
    progresso: Array<Record<string, unknown>>,
  ) =>
    new ModuloService(
      { find: jest.fn().mockResolvedValue(modulos) } as never,
      { find: jest.fn().mockResolvedValue(aulas) } as never,
      {
        createQueryBuilder: jest.fn(() => ({
          innerJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(progresso),
        })),
      } as never,
      { resolveImageUrl: jest.fn().mockResolvedValue(null) } as never,
    );

  it('marca o segundo modulo como locked quando o primeiro nao esta completo', async () => {
    const service = buildService(
      [
        { id: 1, order: 1, thumbnail: null, difficulty: 'iniciante' },
        { id: 2, order: 2, thumbnail: null, difficulty: 'iniciante' },
      ],
      [
        { id: 10, modulo_id: 1, order: 1 },
        { id: 20, modulo_id: 2, order: 1 },
      ],
      [],
    );

    const result = await service.findAll(7);

    expect(result.find((m) => m.id === 1)?.locked).toBe(false);
    expect(result.find((m) => m.id === 2)?.locked).toBe(true);
  });

  it('libera o segundo modulo quando o primeiro esta 100%', async () => {
    const service = buildService(
      [
        { id: 1, order: 1, thumbnail: null, difficulty: 'iniciante' },
        { id: 2, order: 2, thumbnail: null, difficulty: 'iniciante' },
      ],
      [{ id: 10, modulo_id: 1, order: 1 }],
      [{ aula_id: 10, completed: true, last_accessed_at: null }],
    );

    const result = await service.findAll(7);

    expect(result.find((m) => m.id === 1)?.locked).toBe(false);
    expect(result.find((m) => m.id === 2)?.locked).toBe(false);
  });
});

describe('ModuloService thumbnail resolution', () => {
  const modulo = {
    id: 5,
    title: 'Fundamentos',
    thumbnail: 's3://secureplay-media/modulos/5/thumbnail.png',
    active: true,
  };

  const buildService = (resolveImageUrl: jest.Mock) =>
    new ModuloService(
      {
        findOne: jest.fn().mockResolvedValue({ ...modulo }),
        // findAll (chamado por assertModuloDesbloqueado) ve o modulo alvo como primeiro da lista => liberado
        find: jest.fn().mockResolvedValue([{ ...modulo, order: 1 }]),
      } as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      {
        find: jest.fn().mockResolvedValue([]),
        createQueryBuilder: jest.fn(() => ({
          innerJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        })),
      } as never,
      { resolveImageUrl } as never,
    );

  it('resolves the stored reference into a usable url on module detail', async () => {
    const resolveImageUrl = jest
      .fn()
      .mockResolvedValue('https://cdn.test/modulos/5/thumbnail.png?signed');

    const result = await buildService(resolveImageUrl).findOne(5, 7);

    expect(resolveImageUrl).toHaveBeenCalledWith(modulo.thumbnail);
    expect(result.thumbnail).toBe(
      'https://cdn.test/modulos/5/thumbnail.png?signed',
    );
    expect(result.artworkUrl).toBe(result.thumbnail);
  });

  it('returns a null thumbnail instead of failing when the reference is invalid', async () => {
    const resolveImageUrl = jest
      .fn()
      .mockRejectedValue(new Error('Referência de imagem S3 inválida'));

    const result = await buildService(resolveImageUrl).findOne(5, 7);

    expect(result.thumbnail).toBeNull();
    expect(result.title).toBe('Fundamentos');
  });
});
