import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Role } from './roles.enum';

describe('AuthService.signIn — confirmação e senha obrigatória', () => {
  async function setup(overrides: Record<string, unknown> = {}) {
    const user = {
      id: 7,
      email: 'gestao@example.test',
      name: 'Gestão',
      active: true,
      role: Role.PLATFORM_ADMIN,
      password: await bcrypt.hash('senha-inicial', 4),
      email_verification_required: true,
      email_verified_at: new Date(),
      password_change_required: true,
      ...overrides,
    };
    const usuarioService = {
      getUsuarioByEmail: jest.fn().mockResolvedValue(user),
    };
    const jwtService = { sign: jest.fn().mockReturnValue('jwt') };
    const registrationService = {
      startPlatformAdminVerification: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      usuarioService as never,
      jwtService as never,
      {} as never,
      {} as never,
      registrationService as never,
    );
    return { service, jwtService, registrationService };
  }

  it('não emite sessão com a senha inicial após confirmação enquanto a troca estiver pendente', async () => {
    const { service, jwtService } = await setup();
    await expect(
      service.signIn({ email: 'gestao@example.test', password: 'senha-inicial' }),
    ).resolves.toMatchObject({
      requiresPasswordSetup: true,
      email: 'gestao@example.test',
    });
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('inicia confirmação antes de qualquer sessão para novo administrador não verificado', async () => {
    const { service, jwtService, registrationService } = await setup({
      email_verified_at: null,
    });
    await expect(
      service.signIn({ email: 'gestao@example.test', password: 'senha-inicial' }),
    ).resolves.toMatchObject({ requiresEmailVerification: true });
    expect(registrationService.startPlatformAdminVerification).toHaveBeenCalledTimes(1);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('preserva login de conta legada sem confirmação retroativa', async () => {
    const { service, jwtService } = await setup({
      email_verification_required: false,
      email_verified_at: null,
      password_change_required: false,
    });
    await expect(
      service.signIn({ email: 'gestao@example.test', password: 'senha-inicial' }),
    ).resolves.toMatchObject({ token: 'jwt', userId: 7 });
    expect(jwtService.sign).toHaveBeenCalledTimes(1);
  });
});
