import { AppGateway } from './app.gateway';
import { SocketSession } from '../auth/session';

describe('AppGateway — ciclo da sessão', () => {
  const state = (): SocketSession => ({
    userId: 27,
    sessionVersion: 2,
    tokenHash: 'fixture-hash',
    expiresAt: Date.now() + 60_000,
    trialExpiresAt: null,
  });
  const setup = () => {
    const session = state();
    const sessions = {
      authenticate: jest.fn().mockResolvedValue(session),
      validate: jest.fn().mockResolvedValue(session),
    };
    const gateway = new AppGateway(sessions as never);
    const client = {
      id: 'fixture-1',
      connected: true,
      handshake: { headers: { cookie: 'token=fixture-token' } },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
      use: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    client.disconnect.mockImplementation(() => {
      client.connected = false;
    });
    return { gateway, client, sessions, session };
  };
  afterEach(() => {
    jest.useRealTimers();
  });
  const notification = {
    usuario_id: 27,
    id: 1,
    title: 'Fixture',
    message: 'Fixture',
    type: 'achievement',
    created_at: new Date(),
  };

  it('deriva identidade do validador, sem guardar JWT bruto', async () => {
    const { gateway, client, session } = setup();
    Object.assign(client.handshake, { query: { userId: 999 } });
    await gateway.handleConnection(client as never);
    expect(client.data).toEqual(session);
    expect(client.join).toHaveBeenCalledWith([
      'user_27',
      'session_fixture-hash',
    ]);
    expect(JSON.stringify(client.data)).not.toContain('fixture-token');
    gateway.onModuleDestroy();
  });

  it('validação que termina depois do logout não ressuscita envio', async () => {
    const { gateway, client, sessions, session } = setup();
    await gateway.handleConnection(client as never);
    let finish!: (value: SocketSession) => void;
    let started!: () => void;
    const observed = new Promise<void>((resolve) => {
      started = resolve;
    });
    sessions.validate.mockImplementationOnce(
      () =>
        new Promise<SocketSession>((resolve) => {
          started();
          finish = resolve;
        }),
    );
    const pending = gateway.handleNotificationCreated(notification);
    await observed;
    gateway.handleSessionRevoked({ tokenHash: session.tokenHash });
    finish(session);
    await pending;
    expect(client.emit).not.toHaveBeenCalled();
  });

  it.each([undefined, 'token=%malformed'])(
    'cookie ausente ou malformado desconecta: %s',
    async (cookie) => {
      const { gateway, client } = setup();
      client.handshake.headers.cookie = cookie as never;
      await expect(
        gateway.handleConnection(client as never),
      ).resolves.toBeUndefined();
      expect(client.disconnect).toHaveBeenCalledWith(true);
    },
  );

  it('revogação durante join impede concluir o ingresso autorizado', async () => {
    const { gateway, client, sessions } = setup();
    sessions.validate.mockResolvedValue(null);
    await gateway.handleConnection(client as never);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('nega notificação após revogação ou falha de dependência', async () => {
    const { gateway, client, sessions } = setup();
    await gateway.handleConnection(client as never);
    sessions.validate.mockRejectedValue(
      new Error('fixture dependency failure'),
    );
    await gateway.handleNotificationCreated(notification);
    expect(client.emit).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('não envia notificação para outro usuário', async () => {
    const { gateway, client } = setup();
    await gateway.handleConnection(client as never);
    await gateway.handleNotificationCreated({
      ...notification,
      usuario_id: 999,
    });
    expect(client.emit).not.toHaveBeenCalled();
    gateway.onModuleDestroy();
  });

  it('timer encerra sessão expirada sem precisar de nova notificação', async () => {
    jest.useFakeTimers();
    const { gateway, client } = setup();
    await gateway.handleConnection(client as never);
    jest.advanceTimersByTime(60_001);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('revoga somente o hash ou as versões antigas da conta', async () => {
    const { gateway, client } = setup();
    await gateway.handleConnection(client as never);
    gateway.handleSessionRevoked({ tokenHash: 'outro-hash' });
    gateway.handleSessionsRevoked({ userId: 27, sessionVersion: 2 });
    expect(client.disconnect).not.toHaveBeenCalled();
    gateway.handleSessionsRevoked({ userId: 27, sessionVersion: 3 });
    expect(client.disconnect).toHaveBeenCalled();
  });
});
