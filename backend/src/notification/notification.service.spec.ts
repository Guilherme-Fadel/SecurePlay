import { ForbiddenException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Role } from '../auth/roles.enum';

describe('NotificationService tenant authorization', () => {
  const notificationRepository = () => ({
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    update: jest.fn(),
  });

  const makeService = (users: Record<number, object>) => {
    const repository = notificationRepository();
    const service = new NotificationService(
      repository as never,
      { emit: jest.fn() } as never,
      {
        getUsuarioById: jest.fn((id: number) =>
          Promise.resolve(users[id] ?? undefined),
        ),
      } as never,
    );
    return { service, repository };
  };

  it('impede administrador de uma empresa de ler notificações de outra', async () => {
    const { service, repository } = makeService({
      1: { id: 1, role: Role.ADMIN, empresa_id: 10 },
      2: { id: 2, role: Role.USER, empresa_id: 20 },
    });

    await expect(service.getNotificationForActor(2, 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('permite administrador atuar apenas sobre usuários da própria empresa', async () => {
    const { service, repository } = makeService({
      1: { id: 1, role: Role.ADMIN, empresa_id: 10 },
      2: { id: 2, role: Role.USER, empresa_id: 10 },
    });

    await expect(service.getNotificationForActor(2, 1)).resolves.toEqual([]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { usuario_id: 2 },
      order: { created_at: 'DESC' },
    });
  });

  it('permite a operação cross-tenant somente ao papel explícito de plataforma', async () => {
    const { service, repository } = makeService({
      1: { id: 1, role: Role.PLATFORM_ADMIN, empresa_id: null },
      2: { id: 2, role: Role.USER, empresa_id: 20 },
    });

    await expect(service.getNotificationForActor(2, 1)).resolves.toEqual([]);
    expect(repository.find).toHaveBeenCalled();
  });
});
