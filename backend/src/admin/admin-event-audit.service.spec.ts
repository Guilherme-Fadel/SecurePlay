import { AdminAuditService } from './admin-audit.service';

describe('AdminAuditService', () => {
  it('persiste o contexto mínimo de um evento administrativo', async () => {
    const repository = { save: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminAuditService({ getRepository: jest.fn().mockReturnValue(repository) } as never);

    await service.registrar({
      empresaId: 4,
      atorId: 2,
      acao: 'convite.criado',
      alvoTipo: 'convite',
      alvoId: 12,
      detalhes: { email: 'novo@secureplay.test', role: 'user' },
    });

    expect(repository.save).toHaveBeenCalledWith({
      empresa_id: 4,
      ator_id: 2,
      acao: 'convite.criado',
      alvo_tipo: 'convite',
      alvo_id: 12,
      detalhes: { email: 'novo@secureplay.test', role: 'user' },
    });
  });
});
