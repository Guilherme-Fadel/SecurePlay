import { ModuloService } from './modulo.service';
import { NOTIFICATION_EVENTS } from '../../notification/notification-events';

function montar(existente?: Record<string, unknown>) {
  const moduloRepository = {
    create: jest.fn((valor: unknown) => valor),
    save: jest.fn((valor: Record<string, unknown>) =>
      Promise.resolve({ id: 9, ...valor }),
    ),
    findOne: jest.fn().mockResolvedValue(existente),
  };
  const events = { emit: jest.fn() };
  const service = new ModuloService(
    moduloRepository as never,
    {} as never,
    {} as never,
    {} as never,
    events as never,
  );
  return { service, moduloRepository, events };
}

describe('publicação de módulo (evento de notificação)', () => {
  it('módulo criado ativo emite moduloPublicado depois de salvar', async () => {
    const { service, moduloRepository, events } = montar();

    await service.create({ title: 'Privacidade', active: true } as never);

    expect(events.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.moduloPublicado,
      { moduloId: 9, titulo: 'Privacidade' },
    );
    expect(moduloRepository.save.mock.invocationCallOrder[0]).toBeLessThan(
      events.emit.mock.invocationCallOrder[0],
    );
  });

  it('módulo criado inativo não emite', async () => {
    const { service, events } = montar();

    await service.create({ title: 'Rascunho', active: false } as never);

    expect(events.emit).not.toHaveBeenCalled();
  });

  it('ativar um módulo inativo emite uma vez', async () => {
    const { service, events } = montar({
      id: 4,
      title: 'Golpes',
      active: false,
    });

    await service.update(4, { active: true });

    expect(events.emit).toHaveBeenCalledTimes(1);
    expect(events.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.moduloPublicado,
      { moduloId: 4, titulo: 'Golpes' },
    );
  });

  it('editar módulo que já estava ativo não reemite', async () => {
    const { service, events } = montar({
      id: 4,
      title: 'Golpes',
      active: true,
    });

    await service.update(4, { title: 'Golpes online' });

    expect(events.emit).not.toHaveBeenCalled();
  });

  it('desativar não emite', async () => {
    const { service, events } = montar({
      id: 4,
      title: 'Golpes',
      active: true,
    });

    await service.update(4, { active: false });

    expect(events.emit).not.toHaveBeenCalled();
  });

  it('falha ao emitir não desfaz a criação', async () => {
    const { service, events } = montar();
    events.emit.mockImplementation(() => {
      throw new Error('barramento fora');
    });

    await expect(
      service.create({ title: 'X', active: true } as never),
    ).resolves.toMatchObject({ id: 9 });
  });

  it('save que falha não emite nada', async () => {
    const { service, moduloRepository, events } = montar();
    moduloRepository.save.mockRejectedValue(new Error('banco fora'));

    await expect(
      service.create({ title: 'X', active: true } as never),
    ).rejects.toThrow('banco fora');
    expect(events.emit).not.toHaveBeenCalled();
  });
});
