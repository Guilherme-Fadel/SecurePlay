import { RegistrationService } from './registration.service';
import { PendingRegistration } from './pending-registration.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Convite } from '../admin/entities/convite.entity';
import { Empresa } from '../empresa/empresa.entity';
import { Role } from '../auth/roles.enum';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

jest.mock('../dashboard/ranking-history', () => ({
  ...jest.requireActual('../dashboard/ranking-history'),
  ensurePendingRankingSeasonsClosed: jest.fn().mockResolvedValue(undefined),
}));

describe('Cadastro com confirmação por e-mail', () => {
  it.each([undefined, 'Guardião Antigo'])(
    'cria aluno escolar sem e-mail e preserva candidato legado %s',
    async (nickname) => {
      const invite = {
        id: 29,
        token_hash: createHash('sha256').update('invite-token').digest('hex'),
        email: null,
        empresa_id: 8,
        role: Role.USER,
        registration_mode: 'school_student',
        uses: 0,
        max_uses: 1,
        revoked: false,
        expires_at: new Date(Date.now() + 60_000),
      };
      const inviteQuery = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(invite),
      };
      const users = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((value) => value),
        save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
      };
      const inviteRepository = {
        findOne: jest.fn().mockResolvedValue(invite),
        createQueryBuilder: jest.fn().mockReturnValue(inviteQuery),
        save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
      };
      const dataSource = {
        getRepository: (entity: unknown) =>
          entity === Convite ? inviteRepository : users,
        transaction: (callback: (manager: unknown) => unknown) =>
          callback({
            getRepository: (entity: unknown) =>
              entity === Convite ? inviteRepository : users,
          }),
      };
      const emailService = {
        sendVerification: jest.fn(),
        sendPasswordSetup: jest.fn(),
      };
      const service = new RegistrationService(
        dataSource as never,
        emailService as never,
      );

      const result = await service.startInvite('invite-token', {
        name: '  Aluna   Teste ',
        password: 'senha-segura-123',
        username: 'Aluna.Teste',
        nickname,
      });

      expect(result).toEqual({
        sucesso: true,
        mensagem: 'Conta criada. Use seu usuário e senha para entrar.',
        username: 'aluna.teste',
      });
      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Aluna Teste',
          email: null,
          login_code: null,
          username: 'aluna.teste',
          birth_date: null,
          empresa_id: 8,
          role: Role.USER,
          nickname_onboarding_pending: !nickname,
          nickname_pending: nickname ?? null,
        }),
      );
      expect(inviteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ uses: 1 }),
      );
      expect(emailService.sendVerification).not.toHaveBeenCalled();
      expect(emailService.sendPasswordSetup).not.toHaveBeenCalled();
    },
  );

  it('consome link de redefinição, atualiza senha e invalida sessões existentes', async () => {
    const token = 'recovery-token';
    const user = {
      id: 43,
      email: null,
      login_code: 'SP-A1B2C3D4E5F60718',
      active: true,
      role: Role.USER,
      password: 'old-hash',
      password_change_required: false,
      password_reset_token_hash: createHash('sha256')
        .update(token)
        .digest('hex'),
      password_reset_expires_at: new Date(Date.now() + 60_000),
      session_version: 2,
    };
    const query = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(user.password_reset_token_hash ? user : null),
        ),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(query),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    const service = new RegistrationService(
      {
        transaction: (callback: (manager: unknown) => unknown) =>
          callback({ getRepository: () => repository }),
      } as never,
      {} as never,
    );

    await expect(
      service.resetPassword(token, 'nova-senha-segura'),
    ).resolves.toMatchObject({ sucesso: true, login_code: user.login_code });
    expect(await bcrypt.compare('nova-senha-segura', user.password)).toBe(true);
    expect(user.password_reset_token_hash).toBeNull();
    expect(user.password_reset_expires_at).toBeNull();
    expect(user.session_version).toBe(3);
    await expect(
      service.resetPassword(token, 'outra-senha-segura'),
    ).rejects.toThrow('Link de recuperação inválido ou expirado');
  });

  it('recusa apelido em convite de administrador antes de criar cadastro pendente', async () => {
    const invite = {
      id: 3,
      role: Role.ADMIN,
      email: 'admin@example.test',
      empresa_id: 8,
      revoked: false,
      uses: 0,
      max_uses: 1,
      expires_at: new Date(Date.now() + 3600000),
    };
    const pendingRepository = { save: jest.fn() };
    const service = new RegistrationService(
      {
        getRepository: (entity: unknown) =>
          entity === Convite
            ? { findOne: jest.fn().mockResolvedValue(invite) }
            : pendingRepository,
      } as never,
      {} as never,
    );

    await expect(
      service.startInvite('token', {
        name: 'Gestora',
        email: 'admin@example.test',
        birth_date: '1990-02-28',
        nickname: 'Apelido',
      }),
    ).rejects.toThrow('Administradores não utilizam apelidos');
    expect(pendingRepository.save).not.toHaveBeenCalled();
  });

  function setupPasswordResend(overrides: Record<string, unknown> = {}) {
    const user = {
      id: 7,
      email: 'aluno@example.test',
      active: true,
      email_verified_at: new Date(),
      password_change_required: true,
      password_setup_token_hash: null as string | null,
      password_setup_expires_at: null as Date | null,
      password_setup_last_sent_at: null as Date | null,
      ...overrides,
    };
    const lockedQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(() => Promise.resolve(user)),
    };
    const rollbackQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
      createQueryBuilder: jest.fn().mockReturnValue(rollbackQuery),
    };
    const manager = {
      getRepository: () => ({
        createQueryBuilder: () => lockedQuery,
        save: userRepository.save,
      }),
    };
    const pendingRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const emailService = {
      sendPasswordSetup: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RegistrationService(
      {
        getRepository: (entity: unknown) =>
          entity === PendingRegistration ? pendingRepository : userRepository,
        transaction: (callback: (value: unknown) => unknown) =>
          callback(manager),
      } as never,
      emailService as never,
    );

    return {
      user,
      userRepository,
      emailService,
      service,
      lockedQuery,
      rollbackQuery,
    };
  }

  it('reenvia link para conta confirmada e limita solicitações repetidas por conta', async () => {
    const { user, userRepository, emailService, service } =
      setupPasswordResend();

    await service.resend(user.email);
    expect(user.password_setup_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(user.password_setup_expires_at).toBeInstanceOf(Date);
    expect(user.password_setup_last_sent_at).toBeInstanceOf(Date);
    expect(emailService.sendPasswordSetup).toHaveBeenCalledWith(
      user.email,
      expect.any(String),
    );
    const firstHash = user.password_setup_token_hash;
    await service.resend(user.email);
    expect(emailService.sendPasswordSetup).toHaveBeenCalledTimes(1);
    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(user.password_setup_token_hash).toBe(firstHash);
  });

  it('preserva o token anterior quando o e-mail de reenvio falha', async () => {
    const previousHash = 'f'.repeat(64);
    const previousExpiry = new Date(Date.now() + 3600000);
    const previousSent = new Date(Date.now() - 120000);
    const { user, emailService, service, rollbackQuery } = setupPasswordResend({
      password_setup_token_hash: previousHash,
      password_setup_expires_at: previousExpiry,
      password_setup_last_sent_at: previousSent,
    });
    emailService.sendPasswordSetup.mockRejectedValueOnce(
      new Error('E-mail indisponível'),
    );

    await expect(service.resend(user.email)).rejects.toThrow(
      'E-mail indisponível',
    );
    expect(rollbackQuery.set).toHaveBeenCalledWith({
      password_setup_token_hash: previousHash,
      password_setup_expires_at: previousExpiry,
      password_setup_last_sent_at: previousSent,
    });
    expect(rollbackQuery.where).toHaveBeenCalledWith(
      'id = :id AND password_setup_token_hash = :tokenHash',
      { id: 7, tokenHash: user.password_setup_token_hash },
    );
  });

  it('não invalida confirmação recém-enviada por novo login da plataforma', async () => {
    const user = {
      id: 4,
      email: 'plataforma@example.test',
      active: true,
      role: Role.PLATFORM_ADMIN,
      email_verification_required: true,
      email_verified_at: null,
      email_verification_token_hash: null as string | null,
      email_verification_expires_at: null as Date | null,
    };
    const lockedQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(() => Promise.resolve(user)),
    };
    const save = jest
      .fn()
      .mockImplementation((value) => Promise.resolve(value));
    const manager = {
      getRepository: () => ({ createQueryBuilder: () => lockedQuery, save }),
    };
    const emailService = {
      sendVerification: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RegistrationService(
      {
        transaction: (callback: (value: unknown) => unknown) =>
          callback(manager),
      } as never,
      emailService as never,
    );

    await service.startPlatformAdminVerification(user as never);
    const firstHash = user.email_verification_token_hash;
    await service.startPlatformAdminVerification(user as never);

    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
    expect(user.email_verification_token_hash).toBe(firstHash);
    expect(save).toHaveBeenCalledTimes(1);
    expect(emailService.sendVerification).toHaveBeenCalledTimes(1);
  });

  it('consome o link de definição de senha e emite token novo para o formulário', async () => {
    const linkToken = 'link-de-email';
    const hash = (value: string) =>
      createHash('sha256').update(value).digest('hex');
    const user = {
      email_verified_at: new Date(),
      password_change_required: true,
      password_setup_token_hash: hash(linkToken),
      password_setup_expires_at: new Date(Date.now() + 3600000),
    };
    let requestedHash = '';
    const pendingQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const userQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest
        .fn()
        .mockImplementation(
          (_condition: string, params: { tokenHash: string }) => {
            requestedHash = params.tokenHash;
            return userQuery;
          },
        ),
      getOne: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            user.password_setup_token_hash === requestedHash ? user : null,
          ),
        ),
    };
    const userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(userQuery),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(user),
    };
    const manager = {
      getRepository: (entity: unknown) =>
        entity === PendingRegistration
          ? { createQueryBuilder: () => pendingQuery }
          : userRepository,
    };
    const service = new RegistrationService(
      {
        transaction: (callback: (value: unknown) => unknown) =>
          callback(manager),
      } as never,
      {} as never,
    );

    const result = await service.confirm(linkToken);

    expect(result.password_setup_token).toEqual(expect.any(String));
    expect(result.password_setup_token).not.toBe(linkToken);
    expect(user.password_setup_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(user.password_setup_token_hash).toBe(
      hash(result.password_setup_token),
    );
    expect(userRepository.save).toHaveBeenCalledWith(user);
    await expect(service.confirm(linkToken)).rejects.toThrow(
      'Link de confirmação inválido ou expirado',
    );
  });

  it('mantém o teste pendente até a confirmação e não inicia os sete dias', async () => {
    const savePending = jest.fn((value: PendingRegistration) =>
      Promise.resolve(value),
    );
    const pendingRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue({}),
      save: savePending,
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const dataSource = {
      getRepository: (entity: unknown) =>
        entity === PendingRegistration ? pendingRepository : userRepository,
    };
    const emailService = {
      sendVerification: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RegistrationService(
      dataSource as never,
      emailService as never,
    );

    await service.startTrial({
      name: 'Pessoa Teste',
      email: ' PESSOA@example.com ',
      birth_date: '1990-02-28',
    });

    expect(savePending).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'pessoa@example.com',
        kind: 'trial',
        birth_date: '1990-02-28',
      }),
    );
    expect(savePending.mock.calls[0][0]).not.toHaveProperty('password_hash');
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(emailService.sendVerification).toHaveBeenCalledWith(
      'pessoa@example.com',
      expect.any(String),
    );
  });

  it.each([
    { role: Role.USER, nickname: null, expectedWelcome: true },
    { role: Role.USER, nickname: 'Guardião Antigo', expectedWelcome: false },
    { role: Role.ADMIN, nickname: null, expectedWelcome: false },
  ])(
    'confirma cadastro com boas-vindas=$expectedWelcome para $role e apelido $nickname',
    async ({ role, nickname, expectedWelcome }) => {
      const pending = {
        email: 'aluno@example.com',
        name: 'Aluno',
        birth_date: '2016-05-01',
        nickname,
        kind: 'invite',
        invite_id: 5,
        expires_at: new Date(Date.now() + 3600000),
      };
      const invite = {
        id: 5,
        email: 'aluno@example.com',
        empresa_id: 8,
        role,
        uses: 0,
        max_uses: 1,
        revoked: false,
        expires_at: new Date(Date.now() + 3600000),
      };
      const locked = (value: unknown) => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(value),
      });
      const pendingRepository = {
        createQueryBuilder: () => locked(pending),
        remove: jest.fn(),
      };
      const inviteRepository = {
        createQueryBuilder: () => locked(invite),
        save: jest.fn(),
      };
      const userRepository = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((value: Partial<Usuario>) => value),
        save: jest.fn(),
      };
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === PendingRegistration) return pendingRepository;
          if (entity === Convite) return inviteRepository;
          if (entity === Usuario) return userRepository;
          if (entity === Empresa) return { findOne: jest.fn() };
        },
      };
      const dataSource = {
        transaction: (callback: (manager: unknown) => unknown) =>
          callback(manager),
      };
      const service = new RegistrationService(
        dataSource as never,
        { sendVerification: jest.fn() } as never,
      );

      await service.confirm('valid-token');

      expect(inviteRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ uses: 1 }),
      );
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'aluno@example.com',
          empresa_id: 8,
          role,
          nickname_onboarding_pending: expectedWelcome,
          birth_date: '2016-05-01',
          trial_ends_at: null,
          email_verified_at: expect.any(Date) as Date,
        }),
      );
      expect(pendingRepository.remove).toHaveBeenCalledWith(pending);
    },
  );

  it('recusa data de nascimento inexistente', async () => {
    const service = new RegistrationService({} as never, {} as never);
    await expect(
      service.startTrial({
        name: 'Pessoa Teste',
        email: 'pessoa@example.com',
        birth_date: '2026-02-30',
      }),
    ).rejects.toThrow('Data de nascimento inválida');
  });

  it('inicia sete dias de acesso de aluno e exige senha após a confirmação', async () => {
    const pending = {
      email: 'teste@example.com',
      name: 'Pessoa',
      birth_date: '1990-02-28',
      nickname: null,
      kind: 'trial',
      invite_id: null,
      expires_at: new Date(Date.now() + 3600000),
    };
    const pendingRepository = {
      createQueryBuilder: () => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(pending),
      }),
      remove: jest.fn(),
    };
    const companyRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 9, system_key: 'free_trial' }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: Partial<Usuario>) => value),
      save: jest.fn(),
    };
    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === PendingRegistration) return pendingRepository;
        if (entity === Empresa) return companyRepository;
        return userRepository;
      },
    };
    const service = new RegistrationService(
      {
        transaction: (callback: (manager: unknown) => Promise<unknown>) =>
          callback(manager),
      } as never,
      {} as never,
    );

    await service.confirm('valid-token');

    expect(companyRepository.findOne).toHaveBeenCalledWith({
      where: { system_key: 'free_trial' },
    });
    const created = userRepository.create.mock.calls[0][0];
    expect(created).toEqual(
      expect.objectContaining({ empresa_id: 9, role: Role.USER }),
    );
    expect(created.trial_started_at).toBeInstanceOf(Date);
    expect(
      created.trial_ends_at!.getTime() - created.trial_started_at!.getTime(),
    ).toBe(7 * 86400000);
    expect(created.password_change_required).toBe(true);
    expect(created.nickname_onboarding_pending).toBe(true);
    expect(created.password_setup_token_hash).toEqual(expect.any(String));
    expect(created.password_setup_expires_at).toBeInstanceOf(Date);
  });

  it('consome o token temporário ao definir a senha', async () => {
    const user = {
      id: 11,
      password: 'senha-aleatoria',
      password_change_required: true,
      password_setup_token_hash: 'hash',
      password_setup_expires_at: new Date(Date.now() + 3600000),
    };
    const userRepository = {
      createQueryBuilder: () => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      }),
      save: jest.fn(),
    };
    const service = new RegistrationService(
      {
        transaction: (callback: (manager: unknown) => Promise<unknown>) =>
          callback({ getRepository: () => userRepository }),
      } as never,
      {} as never,
    );
    jest.spyOn(service as never, 'hash').mockReturnValue('hash');

    await expect(
      service.setPassword('token', 'nova-senha-segura'),
    ).resolves.toEqual(expect.objectContaining({ sucesso: true }));
    expect(await bcrypt.compare('nova-senha-segura', user.password)).toBe(true);
    expect(user.password_change_required).toBe(false);
    expect(user.password_setup_token_hash).toBeNull();
    expect(userRepository.save).toHaveBeenCalledWith(user);
  });
});

describe('Recuperação de senha por e-mail', () => {
  function setupPasswordReset(overrides: Record<string, unknown> = {}) {
    const user = {
      id: 12,
      email: 'aluno@example.test',
      role: Role.USER,
      active: true,
      email_verified_at: new Date(),
      password: 'old-hash',
      password_change_required: false,
      password_reset_token_hash: null as string | null,
      password_reset_expires_at: null as Date | null,
      session_version: 4,
      ...overrides,
    };
    const lockedQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(() => Promise.resolve(user)),
    };
    const rollbackQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const userRepository = {
      findOne: jest
        .fn()
        .mockImplementation(({ where }: { where: { email: string } }) =>
          Promise.resolve(where.email === user.email ? user : null),
        ),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
      createQueryBuilder: jest.fn().mockReturnValue(rollbackQuery),
    };
    const emailService = {
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
      sendPasswordSetup: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RegistrationService(
      {
        getRepository: () => userRepository,
        transaction: (callback: (value: unknown) => unknown) =>
          callback({
            getRepository: () => ({
              createQueryBuilder: () => lockedQuery,
              save: userRepository.save,
            }),
          }),
      } as never,
      emailService as never,
    );
    return { user, userRepository, emailService, service, rollbackQuery };
  }

  it('envia link de 30 minutos para conta verificada e limita pedidos repetidos', async () => {
    const { user, emailService, service } = setupPasswordReset();

    await service.requestPasswordReset('  Aluno@Example.test ');
    expect(user.password_reset_token_hash).toMatch(/^[a-f0-9]{64}$/);
    const minutes =
      (user.password_reset_expires_at!.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThanOrEqual(30);
    expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
      user.email,
      expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      30,
    );
    const [, token] = emailService.sendPasswordReset.mock.calls[0] as [
      string,
      string,
    ];
    expect(createHash('sha256').update(token).digest('hex')).toBe(
      user.password_reset_token_hash,
    );

    const firstHash = user.password_reset_token_hash;
    await service.requestPasswordReset(user.email);
    expect(emailService.sendPasswordReset).toHaveBeenCalledTimes(1);
    expect(user.password_reset_token_hash).toBe(firstHash);
  });

  it.each([
    ['e-mail desconhecido', {}, 'outra@example.test'],
    ['conta inativa', { active: false }, 'aluno@example.test'],
    [
      'e-mail não verificado',
      { email_verified_at: null },
      'aluno@example.test',
    ],
  ])('não envia nada para %s', async (_case, overrides, address) => {
    const { emailService, service, userRepository } =
      setupPasswordReset(overrides);

    await expect(
      service.requestPasswordReset(address),
    ).resolves.toBeUndefined();
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('envia link de definição para conta que ainda não criou a senha', async () => {
    const { user, emailService, service } = setupPasswordReset({
      password_change_required: true,
      password_setup_last_sent_at: null,
    });

    await service.requestPasswordReset(user.email);
    expect(emailService.sendPasswordSetup).toHaveBeenCalledWith(
      user.email,
      expect.any(String),
    );
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('restaura o link anterior quando o envio falha', async () => {
    const previousHash = 'e'.repeat(64);
    const previousExpiry = new Date(Date.now() + 10 * 60000);
    const { user, emailService, service, rollbackQuery } = setupPasswordReset({
      password_reset_token_hash: previousHash,
      password_reset_expires_at: previousExpiry,
    });
    emailService.sendPasswordReset.mockRejectedValueOnce(
      new Error('E-mail indisponível'),
    );

    await expect(service.requestPasswordReset(user.email)).rejects.toThrow(
      'E-mail indisponível',
    );
    expect(rollbackQuery.set).toHaveBeenCalledWith({
      password_reset_token_hash: previousHash,
      password_reset_expires_at: previousExpiry,
    });
  });

  it('redefine senha de conta com e-mail e invalida sessões', async () => {
    const token = 'email-reset-token';
    const { user, service } = setupPasswordReset({
      password_reset_token_hash: createHash('sha256')
        .update(token)
        .digest('hex'),
      password_reset_expires_at: new Date(Date.now() + 60000),
    });

    await expect(
      service.resetPassword(token, 'nova-senha-segura'),
    ).resolves.toMatchObject({ sucesso: true, email: user.email });
    expect(await bcrypt.compare('nova-senha-segura', user.password)).toBe(true);
    expect(user.password_reset_token_hash).toBeNull();
    expect(user.session_version).toBe(5);
  });

  it('recusa redefinição de conta com e-mail não verificado', async () => {
    const token = 'email-reset-token';
    const { service } = setupPasswordReset({
      email_verified_at: null,
      password_reset_token_hash: createHash('sha256')
        .update(token)
        .digest('hex'),
      password_reset_expires_at: new Date(Date.now() + 60000),
    });

    await expect(
      service.resetPassword(token, 'nova-senha-segura'),
    ).rejects.toThrow('Link de recuperação inválido ou expirado');
  });
});
