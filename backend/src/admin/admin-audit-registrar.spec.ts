import { AdminAuditService } from './admin-audit.service';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';

const evento = {
  empresaId: 3,
  atorId: 9,
  acao: 'turma.criada',
  alvoTipo: 'turma',
  alvoId: 4,
};

describe('AdminAuditService.registrar', () => {
  it('grava pela transação recebida e propaga a falha', async () => {
    const dataSource = { getRepository: jest.fn() };
    const save = jest.fn().mockRejectedValue(new Error('falha de escrita'));
    const manager = { getRepository: jest.fn().mockReturnValue({ save }) };
    const service = new AdminAuditService(dataSource as never);
    await expect(
      (service.registrar as (e: unknown, m: unknown) => Promise<void>)(
        evento,
        manager,
      ),
    ).rejects.toThrow('falha de escrita');
    expect(manager.getRepository).toHaveBeenCalledWith(AdminAuditEvent);
    expect(dataSource.getRepository).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        empresa_id: 3,
        ator_id: 9,
        acao: 'turma.criada',
        alvo_tipo: 'turma',
        alvo_id: 4,
      }),
    );
  });

  it('sem transação mantém o registro tolerante a falha', async () => {
    const save = jest.fn().mockRejectedValue(new Error('falha'));
    const dataSource = { getRepository: jest.fn().mockReturnValue({ save }) };
    const service = new AdminAuditService(dataSource as never);
    await expect(service.registrar(evento)).resolves.toBeUndefined();
  });
});
