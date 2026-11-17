import { ChallengeService } from './challenge.service';
import { AuthService } from '../auth/auth.service';

/** M6: estado que não pode depender só do Redis. */
describe('Desafio do dia durável em SQL (M6)', () => {
  function build(options: {
    cached?: string | null;
    redisDown?: boolean;
    assignments?: Array<number | null>;
  }) {
    const assignments = [...(options.assignments ?? [])];
    const manager = {
      findOne: jest.fn(() => {
        const next = assignments.length ? assignments.shift() : null;
        return Promise.resolve(next ? { challenge_id: next } : null);
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const usuarioChallenges = {
      manager,
      find: jest.fn().mockResolvedValue([]),
    };
    const challenges = {
      find: jest.fn().mockResolvedValue([{ id: 3 }, { id: 4 }, { id: 5 }]),
      findOne: jest.fn(({ where }: { where: { id: number } }) =>
        Promise.resolve({ id: where.id, title: `Desafio ${where.id}` }),
      ),
    };
    const redis = {
      get: options.redisDown
        ? jest.fn().mockRejectedValue(new Error('down'))
        : jest.fn().mockResolvedValue(options.cached ?? null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ChallengeService(
      challenges as never,
      {} as never,
      usuarioChallenges as never,
      redis as never,
      {} as never,
    );
    return { service, manager, usuarioChallenges, redis };
  }

  it('após limpar o Redis, o desafio do dia continua o mesmo', async () => {
    const { service, usuarioChallenges } = build({ assignments: [4] });
    await expect(service.getDailyChallenge(7)).resolves.toMatchObject({
      id: 4,
    });
    expect(usuarioChallenges.find).not.toHaveBeenCalled();
  });

  it('após concluir e limpar o Redis, não há segundo desafio no dia', async () => {
    // O desafio atribuído já foi concluído: continua sendo o do dia (não sorteia outro).
    const { service, manager } = build({ assignments: [5] });
    await expect(service.getDailyChallenge(7)).resolves.toMatchObject({
      id: 5,
    });
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('sem atribuição, grava com INSERT IGNORE e usa a escolha que venceu a corrida', async () => {
    const { service, manager } = build({ assignments: [null, 3] });
    await expect(service.getDailyChallenge(7)).resolves.toMatchObject({
      id: 3,
    });
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT IGNORE INTO daily_challenge_assignment'),
      [7, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), expect.any(Number)],
    );
  });

  it('Redis fora do ar: o desafio do dia vem do SQL', async () => {
    const { service } = build({ redisDown: true, assignments: [4] });
    await expect(service.getDailyChallenge(7)).resolves.toMatchObject({
      id: 4,
    });
  });
});

describe('Logout com LOGOUT_REVOKES_ALL_SESSIONS (D5)', () => {
  const previous = process.env.LOGOUT_REVOKES_ALL_SESSIONS;
  afterEach(() => {
    if (previous === undefined) delete process.env.LOGOUT_REVOKES_ALL_SESSIONS;
    else process.env.LOGOUT_REVOKES_ALL_SESSIONS = previous;
  });

  function build() {
    const usuarioService = {
      revokeAllSessions: jest.fn().mockResolvedValue(9),
    };
    const events = { emit: jest.fn() };
    const service = new AuthService(
      usuarioService as never,
      {
        verifyAsync: jest.fn().mockResolvedValue({
          sub: 7,
          exp: Math.floor(Date.now() / 1000) + 600,
        }),
      } as never,
      { eval: jest.fn().mockResolvedValue(1) } as never,
      {} as never,
      {} as never,
      events as never,
      {} as never,
    );
    return { service, usuarioService, events };
  }

  it('logout com a variável incrementa a versão da sessão (a revogação não depende do Redis; o t7 prova ponta a ponta)', async () => {
    process.env.LOGOUT_REVOKES_ALL_SESSIONS = 'true';
    const { service, usuarioService, events } = build();
    await service.signOut('a.b.c');
    expect(usuarioService.revokeAllSessions).toHaveBeenCalledWith(7);
    expect(events.emit).toHaveBeenCalledWith('auth.sessions.revoked', {
      userId: 7,
      sessionVersion: 9,
    });
  });

  it('sem a variável, o logout encerra só a sessão atual', async () => {
    delete process.env.LOGOUT_REVOKES_ALL_SESSIONS;
    const { service, usuarioService } = build();
    await service.signOut('a.b.c');
    expect(usuarioService.revokeAllSessions).not.toHaveBeenCalled();
  });
});
