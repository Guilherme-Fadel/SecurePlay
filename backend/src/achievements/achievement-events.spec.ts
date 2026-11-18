import { AchievementsService } from './achievements.service';
import {
  Achievement,
  AchievementRequirement,
} from './entities/achievement.entity';
import { UsuarioAchievement } from './entities/usuario-achievement.entity';
import { PrestigeTransaction } from './entities/prestige-transaction.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { UsuarioChallenge } from '../usuario-challenge/usuario-challenge.entity';
import { UsuarioAula } from '../conteudo/usuario-aula/usuario-aula.entity';
import { UsuarioArcadeStats } from '../arcade/entities/usuario-arcade-stats.entity';
import { Usuario } from '../usuario/usuario.entity';
import { NOTIFICATION_EVENTS } from '../notification/notification-events';

const repo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn((value: unknown) => value),
  save: jest.fn((value: unknown) => Promise.resolve(value)),
});

function montar(opcoes: { totalPoints: number; falhaNoCommit?: boolean }) {
  const achievements = repo();
  const registros = repo();
  const carteiras = repo();
  const lancamentos = repo();
  const stats = repo();
  const contagens = repo();
  const arcade = repo();
  const carteira = { usuario_id: 7, balance: 0, total_earned: 0 };
  achievements.find.mockResolvedValue([
    {
      id: 11,
      slug: 'nova-patente',
      name: 'Nova patente',
      description: 'Alcance o nível 2.',
      category: 'elite',
      rarity: 'common',
      requirement_type: AchievementRequirement.LEVEL,
      requirement_value: 2,
      tier: 1,
      icon: 'chevrons-up',
      reward_prestige: 1,
      prerequisite_slug: null,
      position_x: 0,
      position_y: 0,
      secret: false,
    },
  ]);
  registros.find.mockResolvedValue([]);
  carteiras.findOneOrFail.mockResolvedValue(carteira);
  lancamentos.findOne.mockResolvedValue(null);
  lancamentos.find.mockResolvedValue([]);
  stats.findOne.mockResolvedValue({
    total_points: opcoes.totalPoints,
    current_streak: 1,
  });
  contagens.count.mockResolvedValue(0);
  arcade.find.mockResolvedValue([]);
  const manager = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: (entity: unknown) =>
      new Map<unknown, unknown>([
        [Usuario, { findOneOrFail: jest.fn().mockResolvedValue({ id: 7 }) }],
        [Achievement, achievements],
        [UsuarioAchievement, registros],
        [PrestigeWallet, carteiras],
        [PrestigeTransaction, lancamentos],
        [UsuarioStats, stats],
        [UsuarioChallenge, contagens],
        [UsuarioAula, contagens],
        [UsuarioArcadeStats, arcade],
      ]).get(entity),
  };
  const ordem: string[] = [];
  const events = {
    emit: jest.fn((evento: string) => {
      ordem.push(`emit:${evento}`);
    }),
  };
  const dataSource = {
    manager,
    transaction: jest.fn(async (callback: (m: unknown) => Promise<unknown>) => {
      const resultado = await callback(manager);
      if (opcoes.falhaNoCommit) throw new Error('commit falhou');
      ordem.push('commit');
      return resultado;
    }),
  };
  const service = new AchievementsService(
    repo() as never,
    repo() as never,
    dataSource as never,
    events as never,
  );
  return { service, events, ordem, registros, lancamentos };
}

describe('eventos de notificação da trilha de conquistas', () => {
  it('emite conquista e nível só depois do commit, uma vez por novidade', async () => {
    const { service, events, ordem } = montar({ totalPoints: 2000 });

    await service.getTrail(7);

    expect(ordem).toEqual([
      'commit',
      `emit:${NOTIFICATION_EVENTS.conquistaDesbloqueada}`,
      `emit:${NOTIFICATION_EVENTS.nivelAlcancado}`,
    ]);
    expect(events.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.conquistaDesbloqueada,
      { usuarioId: 7, conquistaId: 11, titulo: 'Nova patente' },
    );
    // Nível 1 é o ponto de partida; só o maior nível novo (2) é anunciado.
    expect(events.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.nivelAlcancado,
      { usuarioId: 7, nivel: 2, prestigio: 1 },
    );
  });

  it('não emite nada quando a transação falha (nada foi confirmado)', async () => {
    const { service, events } = montar({
      totalPoints: 2000,
      falhaNoCommit: true,
    });

    await expect(service.getTrail(7)).rejects.toThrow('commit falhou');

    expect(events.emit).not.toHaveBeenCalled();
  });

  it('não repete o aviso na releitura de uma trilha já sincronizada', async () => {
    const { service, events, registros, lancamentos } = montar({
      totalPoints: 2000,
    });
    await service.getTrail(7);
    events.emit.mockClear();

    registros.find.mockResolvedValue([
      {
        achievement_id: 11,
        progress: 2,
        unlocked: true,
        unlocked_at: new Date('2026-01-01'),
      },
    ]);
    lancamentos.find.mockResolvedValue([
      { source_key: 'level:2' },
      { source_key: 'level:3' },
      { source_key: 'achievement:nova-patente' },
    ]);

    await service.getTrail(7);

    expect(events.emit).not.toHaveBeenCalled();
  });

  it('um nível já concedido antes não vira evento, só o que subiu agora', async () => {
    const { service, events, lancamentos } = montar({ totalPoints: 2000 });
    lancamentos.find.mockResolvedValue([{ source_key: 'level:2' }]);

    await service.getTrail(7);

    expect(events.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.nivelAlcancado,
      { usuarioId: 7, nivel: 2, prestigio: 1 },
    );
    expect(events.emit).toHaveBeenCalledTimes(2);
  });

  it('falha ao publicar o evento não quebra a leitura da trilha', async () => {
    const { service, events } = montar({ totalPoints: 2000 });
    events.emit.mockImplementation(() => {
      throw new Error('barramento fora');
    });

    await expect(service.getTrail(7)).resolves.toMatchObject({
      summary: { level: 2 },
    });
  });
});
