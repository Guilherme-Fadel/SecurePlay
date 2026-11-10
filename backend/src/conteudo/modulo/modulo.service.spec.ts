import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ModuloService } from './modulo.service';

const semTurma = { jornadaDoAluno: jest.fn().mockResolvedValue(null) };

describe('ModuloService journey summary', () => {
  let service: ModuloService;

  beforeEach(() => {
    service = new ModuloService({} as never, {} as never, {} as never, semTurma as never);
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
    service = new ModuloService({} as never, {} as never, {} as never, semTurma as never);
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

  it('nega o acesso direto quando o modulo-alvo nao esta ativo', async () => {
    jest.spyOn(service, 'findAll').mockResolvedValue([] as never);

    await expect(service.assertModuloDesbloqueado(50, 7)).rejects.toThrow(
      /módulo não encontrado/i,
    );
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
      semTurma as never,
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

  it('detalha a proxima aula na ordem de capitulos (B1)', async () => {
    const service = buildService(
      [{ id: 1, order: 1, thumbnail: null, difficulty: 'iniciante' }],
      [
        { id: 10, modulo_id: 1, order: 1, section_name: 'Cap 1', title: 'A', type: 'texto', xp: 10, duration: 0 },
        { id: 20, modulo_id: 1, order: 1, section_name: 'Cap 2', title: 'C', type: 'video', xp: 30, duration: 120 },
        { id: 11, modulo_id: 1, order: 2, section_name: 'Cap 1', title: 'B', type: 'quadrinho', xp: 20, duration: 0 },
      ],
      [{ aula_id: 10, completed: true, last_accessed_at: null }],
    );

    const [modulo] = await service.findAll(7);

    expect(modulo.nextAulaId).toBe(11);
    expect(modulo.nextAula).toEqual({
      id: 11,
      title: 'B',
      type: 'quadrinho',
      xp: 20,
      duration: 0,
      section_name: 'Cap 1',
      position: 2,
      lock_reason: null,
      opens_at: null,
    });
  });

  it('devolve nextAula nulo quando todas as aulas estao concluidas', async () => {
    const service = buildService(
      [{ id: 1, order: 1, thumbnail: null }],
      [{ id: 10, modulo_id: 1, order: 1, title: 'A', type: 'texto', xp: 10, duration: 0 }],
      [{ aula_id: 10, completed: true, last_accessed_at: null }],
    );

    const [modulo] = await service.findAll(7);

    expect(modulo.nextAula).toBeNull();
  });

  it('libera a trilha do piloto sem alterar o bloqueio da trilha principal', async () => {
    const service = buildService(
      [
        { id: 1, order: 1, learning_path: 'principal', thumbnail: null },
        { id: 50, order: 1, learning_path: 'piloto-2026', thumbnail: null },
        { id: 2, order: 2, learning_path: 'principal', thumbnail: null },
      ],
      [
        { id: 10, modulo_id: 1, order: 1 },
        { id: 500, modulo_id: 50, order: 1 },
        { id: 20, modulo_id: 2, order: 1 },
      ],
      [],
    );

    const result = await service.findAll(7);

    expect(result.map((modulo) => [modulo.id, modulo.locked])).toEqual([
      [1, false],
      [50, false],
      [2, true],
    ]);
  });
});

describe('ModuloService thumbnail resolution', () => {
  const modulo = {
    id: 5,
    title: 'Fundamentos',
    thumbnail: 's3://secureplay-media/modulos/5/thumbnail.png',
    active: true,
  };

  const buildService = () =>
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
      semTurma as never,
    );

  it('omits an S3 thumbnail so the frontend can use its bundled asset', async () => {
    const result = await buildService().findOne(5, 7);

    expect(result.thumbnail).toBeNull();
    expect(result.artworkUrl).toBe(result.thumbnail);
  });

  it('keeps a non-S3 thumbnail for externally managed content', async () => {
    const originalThumbnail = modulo.thumbnail;
    modulo.thumbnail = 'https://cdn.example/custom-module.png';

    const result = await buildService().findOne(5, 7);

    expect(result.thumbnail).toBe(modulo.thumbnail);
    expect(result.title).toBe('Fundamentos');
    modulo.thumbnail = originalThumbnail;
  });
});

describe('ModuloService sequencia de aulas por capitulo', () => {
  it('conclui o capitulo atual antes de liberar o seguinte', async () => {
    const aulas = [
      {
        id: 10,
        modulo_id: 1,
        order: 1,
        section_name: 'Capitulo 1',
        active: true,
      },
      {
        id: 20,
        modulo_id: 1,
        order: 1,
        section_name: 'Capitulo 2',
        active: true,
      },
      {
        id: 11,
        modulo_id: 1,
        order: 2,
        section_name: 'Capitulo 1',
        active: true,
      },
      {
        id: 21,
        modulo_id: 1,
        order: 2,
        section_name: 'Capitulo 2',
        active: true,
      },
    ];
    const aulaRepository = {
      find: jest.fn().mockResolvedValue(aulas),
    };
    const usuarioAulaRepository = {
      find: jest.fn().mockResolvedValue([
        { aula_id: 10, completed: true, progress_percent: 100 },
        { aula_id: 20, completed: true, progress_percent: 100 },
      ]),
    };
    const service = new ModuloService(
      {
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          active: true,
          thumbnail: null,
        }),
      } as never,
      aulaRepository as never,
      usuarioAulaRepository as never,
      semTurma as never,
    );
    jest
      .spyOn(service, 'assertModuloDesbloqueado')
      .mockResolvedValue(undefined);

    const result = await service.findOne(1, 7);

    expect(result.aulas.map((aula) => aula.id)).toEqual([10, 11, 20, 21]);
    expect(result.aulas.map((aula) => aula.status)).toEqual([
      'completed',
      'unlocked',
      'completed',
      'locked',
    ]);
  });
});

describe('ModuloService jornada da turma', () => {
  const passado = new Date('2026-11-01T08:00:00-03:00');
  const futuro = new Date('2099-11-18T08:00:00-03:00');
  const modulos = [
    { id: 1, order: 1, thumbnail: null, difficulty: 'iniciante', title: 'M1', active: true },
    { id: 2, order: 2, thumbnail: null, difficulty: 'iniciante', title: 'M2', active: true },
    { id: 3, order: 3, thumbnail: null, difficulty: 'iniciante', title: 'M3', active: true },
  ];
  const aulas = [
    { id: 10, modulo_id: 1, order: 1, title: 'A10', type: 'texto', xp: 10, duration: 0, active: true },
    { id: 11, modulo_id: 1, order: 2, title: 'A11', type: 'texto', xp: 10, duration: 0, active: true },
    { id: 20, modulo_id: 2, order: 1, title: 'A20', type: 'texto', xp: 10, duration: 0, active: true },
    { id: 30, modulo_id: 3, order: 1, title: 'A30', type: 'texto', xp: 10, duration: 0, active: true },
  ];
  type Jornada = { turmaId: number; moduloIds: number[]; aberturas: Map<number, Date> };
  const build = (progresso: Array<Record<string, unknown>>, jornada: Jornada | null) =>
    new ModuloService(
      {
        find: jest.fn().mockResolvedValue(modulos),
        findOne: jest.fn(({ where }: { where: { id: number } }) =>
          Promise.resolve(modulos.find((m) => m.id === where.id) ?? null),
        ),
      } as never,
      {
        find: jest.fn(({ where }: { where: { modulo_id?: number } }) =>
          Promise.resolve(
            where?.modulo_id ? aulas.filter((a) => a.modulo_id === where.modulo_id) : aulas,
          ),
        ),
      } as never,
      {
        find: jest.fn().mockResolvedValue(progresso),
        createQueryBuilder: jest.fn(() => ({
          innerJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(progresso),
        })),
      } as never,
      { jornadaDoAluno: jest.fn().mockResolvedValue(jornada) } as never,
    );
  const turma = (moduloIds: number[], aberturas: Array<[number, Date]> = []): Jornada => ({
    turmaId: 4,
    moduloIds,
    aberturas: new Map(aberturas),
  });

  it('sem turma, módulo já começado não fica bloqueado', async () => {
    const service = build([{ aula_id: 20, completed: false, last_accessed_at: null }], null);
    const result = await service.findAll(7);
    expect(result.map((m) => [m.id, m.locked])).toEqual([[1, false], [2, false], [3, true]]);
    expect(result.every((m) => m.outside_journey === false)).toBe(true);
  });

  it('com turma, segue a ordem da turma e bloqueia pela sequência da turma', async () => {
    const result = await build([], turma([2, 1])).findAll(7);
    expect(result.map((m) => [m.id, m.locked])).toEqual([[2, false], [1, true]]);
  });

  it('módulo fora da jornada aparece no fim só quando o aluno tem progresso nele', async () => {
    const result = await build(
      [{ aula_id: 30, completed: true, completed_at: passado, last_accessed_at: null }],
      turma([1]),
    ).findAll(7);
    expect(result.map((m) => [m.id, m.outside_journey])).toEqual([[1, false], [3, true]]);
  });

  it('turma sem módulos devolve jornada vazia sem erro', async () => {
    const service = build([], turma([]));
    await expect(service.findAll(7)).resolves.toEqual([]);
    await expect(service.getJourneySummary(7)).resolves.toMatchObject({
      currentModuleId: null,
      stages: [],
    });
  });

  it('informa o motivo da próxima aula fechada', async () => {
    const [m1] = await build([], turma([1], [[10, futuro]])).findAll(7);
    expect(m1.nextAula).toMatchObject({ id: 10, lock_reason: 'scheduled', opens_at: futuro.toISOString() });
  });

  it('módulo detalhado traz motivo e data de cada aula', async () => {
    const concluida = await build(
      [{ aula_id: 10, completed: true, completed_at: passado, progress_percent: 100 }],
      turma([1], [[10, passado], [11, futuro]]),
    ).findOne(1, 7);
    expect(concluida.aulas.map((a) => [a.id, a.status, a.lock_reason, a.opens_at])).toEqual([
      [10, 'completed', null, null],
      [11, 'locked', 'scheduled', futuro.toISOString()],
    ]);
    const inicio = await build([], turma([1], [[10, passado], [11, futuro]])).findOne(1, 7);
    expect(inicio.aulas.map((a) => [a.id, a.status, a.lock_reason])).toEqual([
      [10, 'unlocked', null],
      [11, 'locked', 'sequence'],
    ]);
  });

  it('aluno movido mantém acesso à aula começada que a nova turma ainda não abriu', async () => {
    const service = build([{ aula_id: 10, completed: false, last_accessed_at: passado }], turma([1]));
    const detalhe = await service.findOne(1, 7);
    expect(detalhe.aulas.find((a) => a.id === 10)?.status).toBe('unlocked');
    await expect(service.assertAulaDaTurma(aulas[0] as never, 7)).resolves.toBe(true);
  });

  it('nó da jornada expõe motivo, data, fora da jornada e a última aula concluída', async () => {
    const resumo = await build(
      [{ aula_id: 10, completed: true, completed_at: passado, last_accessed_at: passado }],
      turma([1], [[10, passado], [11, futuro]]),
    ).getJourneySummary(7);
    expect(resumo.stages[0].nodes[0]).toMatchObject({
      outsideJourney: false,
      nextLessonLockReason: 'scheduled',
      nextLessonOpensAt: futuro.toISOString(),
      lastCompletedAulaId: 10,
    });
  });

  describe('assertAulaDaTurma', () => {
    it('sem turma devolve false para a regra legada decidir', async () => {
      await expect(build([], null).assertAulaDaTurma(aulas[0] as never, 7)).resolves.toBe(false);
    });

    it('aula sem abertura aguarda o professor', async () => {
      await expect(build([], turma([1])).assertAulaDaTurma(aulas[0] as never, 7)).rejects.toThrow(
        new BadRequestException('Esta aula ainda não foi aberta pelo professor.'),
      );
    });

    it('aula agendada informa dia e hora de Brasília', async () => {
      const quando = new Date('2099-11-18T08:00:00-03:00');
      await expect(
        build([], turma([1], [[10, quando]])).assertAulaDaTurma(aulas[0] as never, 7),
      ).rejects.toThrow('Esta aula abre em 18/11 às 08:00.');
    });

    it('aula seguinte com a anterior incompleta pede a anterior', async () => {
      await expect(
        build([], turma([1], [[10, passado], [11, passado]])).assertAulaDaTurma(aulas[1] as never, 7),
      ).rejects.toThrow('Conclua a aula anterior primeiro.');
    });

    it('módulo bloqueado responde como hoje', async () => {
      await expect(
        build([], turma([1, 2], [[20, passado]])).assertAulaDaTurma(aulas[2] as never, 7),
      ).rejects.toThrow(new ForbiddenException('Módulo bloqueado. Conclua o módulo anterior para liberá-lo.'));
    });

    it('módulo fora da jornada sem progresso não é encontrado', async () => {
      await expect(build([], turma([1])).assertAulaDaTurma(aulas[3] as never, 7)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('aula aberta e na sequência passa', async () => {
      await expect(
        build([], turma([1], [[10, passado]])).assertAulaDaTurma(aulas[0] as never, 7),
      ).resolves.toBe(true);
    });
  });
});
