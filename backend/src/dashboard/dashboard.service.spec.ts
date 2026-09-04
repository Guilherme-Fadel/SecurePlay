import { DashboardService } from './dashboard.service';

/**
 * Regressao do check-in automatico: ao concluir qualquer atividade (aula, quiz,
 * desafio ou jogo) o dominio emite progress.changed. O DashboardService escuta
 * esse evento e marca o check-in do dia uma unica vez, concedendo o bonus.
 */
describe('DashboardService check-in automatico', () => {
  const buildService = (redisStore: Record<string, string>) => {
    const statsRepository = {
      findOne: jest.fn().mockResolvedValue({
        usuario_id: 7,
        total_points: 0,
        current_streak: 0,
        last_checkin_date: null,
      }),
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => v),
    };
    const redisService = {
      get: jest.fn(async (key: string) => redisStore[key] ?? null),
      set: jest.fn(async (key: string, value: string) => {
        redisStore[key] = value;
      }),
    };
    const tokenService = { refillToCap: jest.fn().mockResolvedValue(undefined) };
    const eventEmitter = { emitAsync: jest.fn().mockResolvedValue(undefined) };

    const service = new DashboardService(
      statsRepository as never,
      {} as never,
      redisService as never,
      tokenService as never,
      eventEmitter as never,
      {} as never,
      {} as never,
    );
    return { service, statsRepository, redisService, tokenService };
  };

  it('marca o check-in do dia ao receber progress.changed', async () => {
    const store: Record<string, string> = {};
    const { service, redisService, tokenService } = buildService(store);

    await service.handleProgressChanged({ usuarioId: 7 });

    // gravou o array de dias da semana no Redis
    expect(redisService.set).toHaveBeenCalled();
    const streakKey = Object.keys(store).find((k) => k.startsWith('streak:7:'));
    expect(streakKey).toBeDefined();
    expect(JSON.parse(store[streakKey!]).some(Boolean)).toBe(true);
    // recarregou as fichas do arcade
    expect(tokenService.refillToCap).toHaveBeenCalledWith(7);
  });

  it('nao credita bonus duas vezes no mesmo dia (idempotente)', async () => {
    const store: Record<string, string> = {};
    const { service, statsRepository } = buildService(store);

    await service.handleProgressChanged({ usuarioId: 7 });
    const savesAfterFirst = statsRepository.save.mock.calls.length;

    await service.handleProgressChanged({ usuarioId: 7 });

    // o segundo disparo sai cedo (ja checado hoje) e nao persiste stats de novo
    expect(statsRepository.save.mock.calls.length).toBe(savesAfterFirst);
  });

  it('nao propaga erro do check-in automatico', async () => {
    const store: Record<string, string> = {};
    const { service, redisService } = buildService(store);
    redisService.get.mockRejectedValueOnce(new Error('redis down'));

    await expect(
      service.handleProgressChanged({ usuarioId: 7 }),
    ).resolves.toBeUndefined();
  });
});
