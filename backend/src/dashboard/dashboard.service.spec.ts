import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { DashboardService } from './dashboard.service';

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
    jest.spyOn(service, 'onModuleInit').mockResolvedValue();
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
