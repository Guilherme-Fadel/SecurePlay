import { JwtService } from '@nestjs/jwt';
import { SocketSessionService } from './socket-session.service';

const SECRET = 'segredo-jwt-de-teste-com-mais-de-32-caracteres';

function montar() {
  const jwt = new JwtService({ secret: SECRET });
  const users = {
    getUsuarioById: jest.fn().mockResolvedValue({
      id: 7,
      active: true,
      role: 'user',
      session_version: 0,
      trial_ends_at: null,
    }),
  };
  const redis = { get: jest.fn().mockResolvedValue(null) };
  const service = new SocketSessionService(jwt, users as never, redis as never);
  return { jwt, service };
}

describe('SocketSessionService.authenticate', () => {
  it('aceita token de sessão', async () => {
    const { jwt, service } = montar();
    const token = jwt.sign({ sub: 7, sessionVersion: 0 }, { expiresIn: '1h' });
    await expect(service.authenticate(token)).resolves.toMatchObject({
      userId: 7,
    });
  });

  it('recusa token com purpose, como o desafio de MFA', async () => {
    const { jwt, service } = montar();
    const token = jwt.sign(
      { sub: 7, sessionVersion: 0, purpose: 'mfa' },
      { expiresIn: '1h' },
    );
    await expect(service.authenticate(token)).rejects.toMatchObject({
      status: 401,
    });
  });
});
