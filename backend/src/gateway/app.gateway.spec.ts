import { AppGateway } from './app.gateway';
import { Role } from '../auth/roles.enum';

describe('AppGateway', () => {
  const makeSocket = (cookie?: string) => ({
    id: 'socket-1',
    handshake: { headers: { cookie } },
    data: {},
    join: jest.fn(),
    disconnect: jest.fn(),
  });

  it('rejeita uma conexão sem cookie de autenticação', async () => {
    const gateway = new AppGateway(
      { verifyAsync: jest.fn() } as never,
      { get: jest.fn() } as never,
    );
    const socket = makeSocket();

    await gateway.handleConnection(socket as never);

    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('deriva a sala do sub do JWT, ignorando qualquer ID declarado pelo cliente', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 27, role: Role.USER }),
    };
    const gateway = new AppGateway(
      jwtService as never,
      { get: jest.fn().mockResolvedValue(null) } as never,
    );
    const socket = makeSocket('theme=dark; token=jwt-assinado');
    (socket.handshake as any).query = { userId: '999' };

    await gateway.handleConnection(socket as never);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('jwt-assinado');
    expect(socket.data).toEqual({ userId: 27 });
    expect(socket.join).toHaveBeenCalledWith('user_27');
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('rejeita JWT revogado pela blacklist', async () => {
    const gateway = new AppGateway(
      {
        verifyAsync: jest.fn().mockResolvedValue({ sub: 27, role: Role.USER }),
      } as never,
      { get: jest.fn().mockResolvedValue('1') } as never,
    );
    const socket = makeSocket('token=jwt-revogado');

    await gateway.handleConnection(socket as never);

    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
  });
});
