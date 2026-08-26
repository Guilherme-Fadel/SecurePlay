import { Test, TestingModule } from '@nestjs/testing';
import { XpService } from './xp.service';
import { RedisService } from '../../redis/redis.service';

describe('XpService', () => {
  let service: XpService;
  let statsRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let redisService: { incrBy: jest.Mock };

  beforeEach(async () => {
    statsRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    redisService = { incrBy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XpService,
        { provide: 'USUARIO_STATS_REPOSITORY', useValue: statsRepository },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<XpService>(XpService);
  });

  it('soma o XP em total_points de um stats existente', async () => {
    const stats = { usuario_id: 1, total_points: 100 };
    statsRepository.findOne.mockResolvedValue(stats);

    await service.creditXp(1, 50);

    expect(stats.total_points).toBe(150);
    expect(statsRepository.save).toHaveBeenCalledWith(stats);
  });

  it('acumula o XP do dia no Redis (xp-today) com TTL', async () => {
    statsRepository.findOne.mockResolvedValue({
      usuario_id: 1,
      total_points: 0,
    });

    await service.creditXp(1, 30);

    expect(redisService.incrBy).toHaveBeenCalledWith(
      'xp-today:1',
      30,
      expect.any(Number),
    );
  });

  it('cria stats quando o usuario ainda nao tem registro', async () => {
    statsRepository.findOne.mockResolvedValue(null);
    const created = { usuario_id: 2, total_points: 0 };
    statsRepository.create.mockReturnValue(created);

    await service.creditXp(2, 40);

    expect(statsRepository.create).toHaveBeenCalledWith({ usuario_id: 2 });
    expect(created.total_points).toBe(40);
    expect(statsRepository.save).toHaveBeenCalledWith(created);
  });

  it('ignora valores <= 0 (nao credita nem toca no Redis)', async () => {
    await service.creditXp(1, 0);
    await service.creditXp(1, -10);

    expect(statsRepository.findOne).not.toHaveBeenCalled();
    expect(statsRepository.save).not.toHaveBeenCalled();
    expect(redisService.incrBy).not.toHaveBeenCalled();
  });
});
