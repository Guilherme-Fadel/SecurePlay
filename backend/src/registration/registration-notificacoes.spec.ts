import { createHash } from 'crypto';
import { Convite } from '../admin/entities/convite.entity';
import { Role } from '../auth/roles.enum';
import { NOTIFICATION_EVENTS } from '../notification/notification-events';
import { ConviteTurma } from '../turma/entities/convite-turma.entity';
import { Turma } from '../turma/entities/turma.entity';
import { TurmaAluno } from '../turma/entities/turma-aluno.entity';
import { Usuario } from '../usuario/usuario.entity';
import { RegistrationService } from './registration.service';

jest.mock('../dashboard/ranking-history', () => ({
  ensurePendingRankingSeasonsClosed: jest.fn().mockResolvedValue(undefined),
}));

function transacao(repositorios: (entity: unknown) => unknown) {
  return {
    transaction: (callback: (manager: unknown) => unknown) =>
      callback({ getRepository: repositorios }),
  };
}

function consulta(usuario: object | null) {
  return {
    createQueryBuilder: () => ({
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(usuario),
    }),
    save: jest.fn((valor: unknown) => Promise.resolve(valor)),
  };
}

async function cadastrarPorConviteDeTurma(comTurma: boolean) {
  const convite = {
    id: 31,
    token_hash: createHash('sha256').update('turma-token').digest('hex'),
    email: null,
    empresa_id: 8,
    role: Role.USER,
    registration_mode: 'school_student',
    uses: 0,
    max_uses: 1,
    revoked: false,
    expires_at: new Date(Date.now() + 60_000),
  };
  const usuarios = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((valor: Partial<Usuario>) => valor),
    save: jest.fn((valor: Partial<Usuario>) =>
      Promise.resolve(Object.assign(valor, { id: 77 })),
    ),
  };
  const ligacao = comTurma ? { convite_id: 31, turma_id: 4 } : null;
  const repositorios = new Map<unknown, unknown>([
    [
      Convite,
      {
        createQueryBuilder: () => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(convite),
        }),
        save: jest.fn((valor: unknown) => Promise.resolve(valor)),
      },
    ],
    [ConviteTurma, { findOne: jest.fn().mockResolvedValue(ligacao) }],
    [Turma, { findOne: jest.fn().mockResolvedValue({ id: 4, empresa_id: 8 }) }],
    [TurmaAluno, { insert: jest.fn().mockResolvedValue(undefined) }],
  ]);
  const emit = jest.fn();
  const fonte = transacao((entidade) => repositorios.get(entidade) ?? usuarios);
  const service = new RegistrationService(
    {
      ...fonte,
      getRepository: () => ({ findOne: jest.fn().mockResolvedValue(convite) }),
    } as never,
    {} as never,
    { emit } as never,
  );
  await service.startInvite('turma-token', {
    name: 'Aluna Turma',
    password: 'senha-segura-123',
    username: 'aluna.turma',
  });
  return emit;
}

describe('RegistrationService: eventos de notificação', () => {
  it('resetPassword emite senhaAlterada (recuperacao) depois do commit', async () => {
    const token = 'recovery-token';
    const usuario = {
      id: 43,
      email: 'ana@example.test',
      email_verified_at: new Date(),
      active: true,
      role: Role.USER,
      password: 'antigo',
      password_reset_token_hash: createHash('sha256')
        .update(token)
        .digest('hex'),
      password_reset_expires_at: new Date(Date.now() + 60_000),
      session_version: 1,
    };
    const emit = jest.fn();
    const service = new RegistrationService(
      transacao(() => consulta(usuario)) as never,
      {} as never,
      { emit } as never,
    );

    await service.resetPassword(token, 'nova-senha-segura');

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.senhaAlterada, {
      usuarioId: 43,
      origem: 'recuperacao',
    });
  });

  it('resetPassword com link inválido não emite', async () => {
    const emit = jest.fn();
    const service = new RegistrationService(
      transacao(() => consulta(null)) as never,
      {} as never,
      { emit } as never,
    );

    await expect(
      service.resetPassword('x', 'nova-senha-segura'),
    ).rejects.toThrow();

    expect(emit).not.toHaveBeenCalled();
  });

  it('setPassword (definição inicial) não emite senhaAlterada', async () => {
    const usuario = {
      id: 11,
      password: 'aleatoria',
      password_change_required: true,
      password_setup_token_hash: 'hash',
      password_setup_expires_at: new Date(Date.now() + 3600000),
    };
    const emit = jest.fn();
    const service = new RegistrationService(
      transacao(() => consulta(usuario)) as never,
      {} as never,
      { emit } as never,
    );

    await expect(
      service.setPassword('token', 'nova-senha-segura'),
    ).resolves.toEqual(expect.objectContaining({ sucesso: true }));

    expect(emit).not.toHaveBeenCalled();
  });

  it('cadastro por convite de turma emite alunoEntrouTurma', async () => {
    const emit = await cadastrarPorConviteDeTurma(true);

    expect(emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.alunoEntrouTurma, {
      turmaId: 4,
      usuarioId: 77,
    });
  });

  it('cadastro por convite sem turma não emite alunoEntrouTurma', async () => {
    const emit = await cadastrarPorConviteDeTurma(false);

    expect(emit).not.toHaveBeenCalled();
  });
});
