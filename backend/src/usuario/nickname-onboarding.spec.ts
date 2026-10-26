import { UsuarioService } from './usuario.service';
import { Role } from '../auth/roles.enum';
import { UsuarioController } from './usuario.controller';

describe('Boas-vindas para escolha de apelido', () => {
  const setup = (fields: Record<string, unknown> = {}) => {
    const user = {
      id: 31,
      role: Role.USER,
      empresa_id: 7,
      nickname: null,
      nickname_pending: null,
      nickname_request_status: 'none',
      nickname_onboarding_pending: true,
      ...fields,
    };
    const users = {
      findOne: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user),
    };
    const service = new UsuarioService(
      users as never,
      { resolveProfileImageUrl: jest.fn() } as never,
    );
    return { user, users, service };
  };

  it('envia o apelido para aprovação e conclui as boas-vindas na mesma gravação', async () => {
    const { user, users, service } = setup();
    await expect(
      service.requestNickname(31, '  Guardião   Azul '),
    ).resolves.toMatchObject({
      nickname: null,
      nickname_pending: 'Guardião Azul',
      nickname_request_status: 'pending',
      nickname_onboarding_pending: false,
    });
    expect(user.nickname).toBeNull();
    expect(users.update).toHaveBeenCalledTimes(1);
    expect(users.update).toHaveBeenCalledWith(
      31,
      expect.objectContaining({
        nickname_onboarding_pending: false,
        nickname_pending: 'Guardião Azul',
      }),
    );
  });

  it('entrada inválida não consome as boas-vindas', async () => {
    const { user, users, service } = setup();
    await expect(service.requestNickname(31, 'ab@')).rejects.toThrow();
    expect(user.nickname_onboarding_pending).toBe(true);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('escolher depois mantém o perfil e o apelido intactos e é idempotente', async () => {
    const { user, users, service } = setup();
    await expect(service.dismissNicknameOnboarding(31)).resolves.toEqual({
      nickname_onboarding_pending: false,
    });
    await service.dismissNicknameOnboarding(31);
    expect(user.nickname_pending).toBeNull();
    expect(user.nickname_request_status).toBe('none');
    expect(users.update).toHaveBeenCalledTimes(1);
    expect(users.findOne).toHaveBeenCalledWith({ where: { id: 31 } });
  });

  it.each([Role.ADMIN, Role.PLATFORM_ADMIN])(
    'gerência %s não utiliza boas-vindas de aluno',
    async (role) => {
      const { users, service } = setup({ role });
      await expect(service.dismissNicknameOnboarding(31)).rejects.toThrow();
      expect(users.update).not.toHaveBeenCalled();
    },
  );

  it('perfil sem organização não pode concluir boas-vindas', async () => {
    const { users, service } = setup({ empresa_id: null });
    await expect(service.dismissNicknameOnboarding(31)).rejects.toThrow();
    expect(users.update).not.toHaveBeenCalled();
  });

  it('não retorna sucesso quando a persistência falha', async () => {
    const { users, service } = setup();
    users.update.mockRejectedValue(new Error('Falha simulada'));
    await expect(service.dismissNicknameOnboarding(31)).rejects.toThrow(
      'Falha simulada',
    );
  });

  it.each([true, false, undefined])(
    'sessão expõe boas-vindas=%s sem ativar contas antigas',
    async (pending) => {
      const { service } = setup({ nickname_onboarding_pending: pending });
      await expect(service.getUsuarioDados(31)).resolves.toMatchObject({
        nickname_onboarding_pending: Boolean(pending),
      });
    },
  );

  it('controller deriva a identidade da sessão autenticada', async () => {
    const service = {
      dismissNicknameOnboarding: jest
        .fn()
        .mockResolvedValue({ nickname_onboarding_pending: false }),
    };
    const controller = new UsuarioController(service as never);
    const request = {
      user: { userId: 31 },
      body: { userId: 99 },
    };
    await controller.dismissNicknameOnboarding(request);
    expect(service.dismissNicknameOnboarding).toHaveBeenCalledWith(31);
  });
});
