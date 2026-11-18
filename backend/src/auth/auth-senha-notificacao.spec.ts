import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { NOTIFICATION_EVENTS } from '../notification/notification-events';

function montar(changePassword: jest.Mock) {
  const emit = jest.fn();
  const auth = new AuthService(
    { changePassword } as never,
    new JwtService({ secret: 'x'.repeat(40) }),
    {} as never,
    {} as never,
    {} as never,
    { emit } as never,
    {} as never,
  );
  return { auth, emit };
}

describe('AuthService.changePassword: notificação de segurança', () => {
  it('emite senhaAlterada (perfil) depois de trocar a senha', async () => {
    const { auth, emit } = montar(
      jest.fn().mockResolvedValue({ id: 9, session_version: 4, role: 'user' }),
    );

    await auth.changePassword(
      9,
      { currentPassword: 'antiga-123', newPassword: 'nova-1234' },
      3,
    );

    expect(emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.senhaAlterada, {
      usuarioId: 9,
      origem: 'perfil',
    });
  });

  it('não emite quando a troca falha', async () => {
    const { auth, emit } = montar(
      jest.fn().mockRejectedValue(new Error('Senha atual inválida')),
    );

    await expect(
      auth.changePassword(
        9,
        { currentPassword: 'errada', newPassword: 'nova-1234' },
        3,
      ),
    ).rejects.toThrow();

    expect(emit).not.toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.senhaAlterada,
      expect.anything(),
    );
  });
});
