import { NOTIFICATION_EVENTS } from '../../notification/notification-events';
import { AulaService } from './aula.service';

function montar(opcoes: { modulo?: Record<string, unknown>; aula?: object }) {
  const modulo = opcoes.modulo ?? { id: 8, title: 'Privacidade', active: true };
  const aulaRepository = {
    // assertOrderAvailable não acha duplicata; update acha a aula existente.
    findOne: jest.fn((consulta: { where: { id?: unknown; order?: number } }) =>
      Promise.resolve(
        typeof consulta.where.id === 'number' ? opcoes.aula : null,
      ),
    ),
    create: jest.fn((valor: unknown) => valor),
    save: jest.fn((valor: Record<string, unknown>) =>
      Promise.resolve({ id: 100, ...valor }),
    ),
  };
  const moduloRepository = { findOne: jest.fn().mockResolvedValue(modulo) };
  const events = { emit: jest.fn() };
  const service = new AulaService(
    aulaRepository as never,
    {} as never,
    {} as never,
    moduloRepository as never,
    {} as never,
    {} as never,
    {} as never,
    events as never,
  );
  return { service, aulaRepository, events };
}

const aviso = { moduloId: 8, titulo: 'Privacidade' };

describe('aula nova ou ativada anuncia o módulo ativo', () => {
  it('aula criada ativa em módulo ativo emite moduloPublicado depois de salvar', async () => {
    const { service, aulaRepository, events } = montar({});

    await service.create({ modulo_id: 8, title: 'A1', order: 1 } as never);

    expect(events.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.moduloPublicado,
      aviso,
    );
    expect(aulaRepository.save.mock.invocationCallOrder[0]).toBeLessThan(
      events.emit.mock.invocationCallOrder[0],
    );
  });

  it('aula criada inativa ou em módulo inativo não emite', async () => {
    const inativa = montar({});
    await inativa.service.create({
      modulo_id: 8,
      title: 'A1',
      order: 1,
      active: false,
    } as never);
    expect(inativa.events.emit).not.toHaveBeenCalled();

    const moduloInativo = montar({
      modulo: { id: 8, title: 'Rascunho', active: false },
    });
    await moduloInativo.service.create({
      modulo_id: 8,
      title: 'A1',
      order: 1,
    } as never);
    expect(moduloInativo.events.emit).not.toHaveBeenCalled();
  });

  it('ativar uma aula inativa emite; editar aula já ativa não emite', async () => {
    const virada = montar({
      aula: { id: 5, modulo_id: 8, active: false, order: 1 },
    });
    await virada.service.update(5, { active: true });
    expect(virada.events.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.moduloPublicado,
      aviso,
    );

    const edicao = montar({
      aula: { id: 5, modulo_id: 8, active: true, order: 1 },
    });
    await edicao.service.update(5, { title: 'Novo título' });
    expect(edicao.events.emit).not.toHaveBeenCalled();
  });

  it('falha ao avisar nunca desfaz a criação da aula', async () => {
    const { service, events } = montar({});
    events.emit.mockImplementation(() => {
      throw new Error('barramento fora');
    });

    await expect(
      service.create({ modulo_id: 8, title: 'A1', order: 1 } as never),
    ).resolves.toMatchObject({ id: 100 });
  });
});
