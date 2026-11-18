import { ConvitesService } from './convites.service';
import { Role } from '../auth/roles.enum';
import { NOTIFICATION_EVENTS } from '../notification/notification-events';

jest.mock('../dashboard/ranking-history', () => ({
  ensurePendingRankingSeasonsClosed: jest.fn().mockResolvedValue(undefined),
}));

describe('ConvitesService: eventos de notificação do apelido', () => {
  const montar = (usuario: Record<string, unknown>) => {
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(usuario),
      update: jest.fn().mockResolvedValue(undefined),
      manager: { connection: {} },
    };
    const eventEmitter = { emit: jest.fn() };
    const adminAuditService = {
      registrar: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ConvitesService(
      {} as never,
      usuarioRepository as never,
      {} as never,
      {} as never,
      adminAuditService as never,
      eventEmitter as never,
      {} as never,
    );
    return { service, eventEmitter, usuarioRepository };
  };
  const aluno = () => ({
    id: 7,
    empresa_id: 3,
    role: Role.USER,
    name: 'Aluno',
    nickname: null,
    nickname_pending: 'Raio',
    nickname_request_status: 'pending',
  });

  it('aprovar emite decisão e atualiza o resumo da escola depois de salvar', async () => {
    const { service, eventEmitter, usuarioRepository } = montar(aluno());

    await service.aprovarApelidoDaEmpresa(3, 7, 99);

    expect(usuarioRepository.update).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.apelidoDecidido,
      { usuarioId: 7, aprovado: true, apelido: 'Raio' },
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.apelidoSolicitado,
      { empresaId: 3 },
    );
  });

  it('rejeitar emite decisão negativa com o apelido recusado', async () => {
    const { service, eventEmitter } = montar(aluno());

    await service.rejeitarApelidoDaEmpresa(3, 7, 99);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.apelidoDecidido,
      { usuarioId: 7, aprovado: false, apelido: 'Raio' },
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.apelidoSolicitado,
      { empresaId: 3 },
    );
  });

  it('sem apelido pendente não emite nada', async () => {
    const { service, eventEmitter } = montar({
      ...aluno(),
      nickname_pending: null,
    });

    await expect(service.aprovarApelidoDaEmpresa(3, 7, 99)).rejects.toThrow();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
