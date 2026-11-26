import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { DashboardService } from './dashboard.service';
import { defaultCharacterColor } from '../achievements/character-color';
import { resolveCompanyParameters } from '../config/features';
import { Usuario } from '../usuario/usuario.entity';
import { rankKey } from './rank-key';

describe('DashboardService — entrega de progresso/check-in', () => {
  const build = () => {
    const checkins = {
      register: jest.fn().mockResolvedValue({ bonusXp: 5 }),
      registerForDay: jest.fn().mockResolvedValue(undefined),
      weekly: jest.fn().mockResolvedValue({ checkedToday: true }),
    };
    const service = new DashboardService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      checkins as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, checkins };
  };

  it('envia a identidade recebida para o check-in durável', async () => {
    const { service, checkins } = build();
    await service.handleProgressChanged({ usuarioId: 7 });
    expect(checkins.register).toHaveBeenCalledWith(7);
    expect(await service.getWeeklyStreak(7)).toEqual({ checkedToday: true });
  });

  it('não cria outro check-in ao entregar o bônus do próprio check-in', async () => {
    const { service, checkins } = build();
    await service.handleProgressChanged({ usuarioId: 7, skipCheckin: true });
    expect(checkins.register).not.toHaveBeenCalled();
  });

  it('encaminha o dia original da missão para validação transacional do fallback', async () => {
    const { service, checkins } = build();
    await service.handleProgressChanged({
      usuarioId: 7,
      checkinDay: '2026-10-27',
    });
    expect(checkins.registerForDay).toHaveBeenCalledWith(7, '2026-10-27');
    expect(checkins.register).not.toHaveBeenCalled();
  });

  it('Nest propaga a falha do listener para manter o outbox do produtor pendente', async () => {
    const { service, checkins } = build();
    checkins.register.mockRejectedValue(new Error('SQL indisponível'));
    jest.spyOn(service, 'onApplicationBootstrap').mockResolvedValue();
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [{ provide: DashboardService, useValue: service }],
    }).compile();
    await module.init();
    try {
      await expect(
        module
          .get(EventEmitter2)
          .emitAsync('progress.changed', { usuarioId: 7 }),
      ).rejects.toThrow('SQL indisponível');
    } finally {
      await module.close();
    }
  });
});

describe('DashboardService — visual equipado no ranking', () => {
  const equippedRow = (
    usuario_id: number,
    type: string,
    visual_value: string,
  ) => ({
    usuario_id,
    equipped: true,
    color: '#112233',
    cosmetic_item: {
      id: 55,
      slug: 'cartola-interna',
      name: 'Cartola',
      price: 900,
      type,
      visual_value,
      art_key: null,
      adjust_x: 1,
      adjust_y: 2,
      adjust_scale: 1.5,
      layer: 'front',
    },
  });

  const build = (
    rows: unknown[],
    owners: Array<{ id: number; character_color: string | null }> = [],
  ) => {
    const parameters = resolveCompanyParameters({ globalRankingEnabled: true });
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        usuario: {
          empresa: { id: 3, nome: 'Escola' },
          role: 'user',
          nickname: 'Eu',
          email: 'eu@escola.com',
        },
      }),
      getMany: jest.fn().mockResolvedValue([
        {
          usuario_id: 11,
          total_points: 900,
          usuario: {
            nickname: 'Cartola',
            email: 'a@escola.com',
            empresa_id: 3,
          },
        },
        {
          usuario_id: 7,
          total_points: 800,
          usuario: { nickname: 'Eu', email: 'eu@escola.com', empresa_id: 3 },
        },
        {
          usuario_id: 12,
          total_points: 700,
          usuario: {
            nickname: 'Sem item',
            email: 'b@escola.com',
            empresa_id: 3,
          },
        },
      ]),
    };
    const find = jest.fn().mockResolvedValue(rows);
    const findUsers = jest.fn().mockResolvedValue(owners);
    const dataSource = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Usuario ? { find: findUsers } : { find },
      ),
      query: jest.fn().mockResolvedValue([]),
    };
    const service = new DashboardService(
      {
        findOne: jest
          .fn()
          .mockResolvedValue({ usuario_id: 7, total_points: 800 }),
        createQueryBuilder: jest.fn().mockReturnValue(query),
      } as never,
      dataSource as never,
      {} as never,
      {
        get: jest.fn().mockResolvedValue(null),
        mget: jest.fn((keys: string[]) =>
          Promise.resolve(keys.map(() => null)),
        ),
      } as never,
      {} as never,
      {} as never,
      { resolveImageUrl: jest.fn() } as never,
      {} as never,
      { requireFeature: jest.fn().mockResolvedValue(parameters) } as never,
    );
    return { service, find };
  };

  it('traz a cartola equipada na entrada do aluno, sem expor id, e-mail nem preço', async () => {
    const { service, find } = build([equippedRow(11, 'head', 'cartola')]);
    const ranking = await service.getRanking(7, 'global', false);
    const entry = ranking.leaderboard.find((e) => e.name === 'Cartola');
    expect(entry?.look).toEqual({
      bodyColor: defaultCharacterColor(rankKey(11)),
      head: {
        visualValue: 'cartola',
        artUrl: null,
        color: '#112233',
        adjust: { x: 1, y: 2, scale: 1.5 },
        layer: 'front',
      },
    });
    expect(
      ranking.leaderboard.find((e) => e.name === 'Sem item')?.look,
    ).toEqual({ bodyColor: defaultCharacterColor(rankKey(12)) });
    expect(ranking.currentUser?.look).toEqual({
      bodyColor: defaultCharacterColor(rankKey(7)),
    });
    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuario_id: expect.objectContaining({
            _value: expect.arrayContaining([11, 12, 7]) as number[],
          }) as object,
        }) as object,
      }),
    );
    const json = JSON.stringify(ranking);
    for (const leak of ['@escola.com', 'cartola-interna', '"price"', '"slug"'])
      expect(json).not.toContain(leak);
    expect(Object.keys(entry ?? {})).not.toContain('usuarioId');
  });

  it('traz a cor base escolhida no look do ranking e a padrão de quem não escolheu', async () => {
    const { service } = build([], [{ id: 11, character_color: 'vermelho' }]);
    const ranking = await service.getRanking(7, 'global', false);
    expect(
      ranking.leaderboard.find((e) => e.name === 'Cartola')?.look.bodyColor,
    ).toBe('vermelho');
    expect(
      ranking.leaderboard.find((e) => e.name === 'Sem item')?.look.bodyColor,
    ).toBe(defaultCharacterColor(rankKey(12)));
    expect(ranking.currentUser?.look?.bodyColor).toBe(
      defaultCharacterColor(rankKey(7)),
    );
  });

  it('o ranking continua quando o visual não carrega', async () => {
    const { service, find } = build([]);
    find.mockRejectedValue(new Error('banco'));
    const ranking = await service.getRanking(7, 'global', false);
    expect(ranking.leaderboard).toHaveLength(3);
    expect(ranking.leaderboard[0].look).toEqual({});
  });
});
