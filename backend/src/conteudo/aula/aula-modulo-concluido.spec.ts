import { AulaService } from './aula.service';

describe('conclusão de módulo grava notificação de progresso agrupada', () => {
  it('usa tipo progresso, link /aprender e group_key por módulo na própria transação', async () => {
    const salvar = jest.fn((valor: Record<string, unknown>) =>
      Promise.resolve({ id: 5, created_at: new Date(), ...valor }),
    );
    const marcador = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((valor: unknown) => valor),
      save: jest.fn().mockResolvedValue({}),
    };
    const consulta = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
    };
    const manager = {
      getRepository: jest.fn((entidade: { name: string }) => {
        switch (entidade.name) {
          case 'ActivityCompletion':
            return marcador;
          case 'Aula':
            return { count: jest.fn().mockResolvedValue(2) };
          case 'UsuarioAula':
            return { createQueryBuilder: jest.fn(() => consulta) };
          case 'Modulo':
            return {
              findOneByOrFail: jest.fn().mockResolvedValue({
                id: 8,
                title: 'Privacidade',
                xp_bonus: 30,
              }),
            };
          case 'Notification':
            return { save: salvar };
          default:
            throw new Error(`Repositório inesperado: ${entidade.name}`);
        }
      }),
    };
    const service = new AulaService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const resultado = await (
      service as unknown as {
        completeModule: (
          m: unknown,
          modulo: number,
          usuario: number,
        ) => Promise<{ xp: number; notifications: Array<{ type: string }> }>;
      }
    ).completeModule(manager, 8, 7);

    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 7,
        type: 'progresso',
        link: '/aprender',
        group_key: 'modulo-concluido:8',
        readed: false,
      }),
    );
    expect(resultado.xp).toBe(30);
    expect(resultado.notifications).toHaveLength(1);
    expect(resultado.notifications[0].type).toBe('progresso');
  });

  it('módulo já concluído antes não grava de novo', async () => {
    const marcador = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
    const manager = { getRepository: jest.fn(() => marcador) };
    const service = new AulaService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const resultado = await (
      service as unknown as {
        completeModule: (
          m: unknown,
          a: number,
          b: number,
        ) => Promise<{ notifications: unknown[] }>;
      }
    ).completeModule(manager, 8, 7);

    expect(resultado.notifications).toEqual([]);
  });
});
