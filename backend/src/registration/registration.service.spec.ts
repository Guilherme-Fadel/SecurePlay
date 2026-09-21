import { RegistrationService } from './registration.service';
import { PendingRegistration } from './pending-registration.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Convite } from '../admin/entities/convite.entity';
import { Empresa } from '../empresa/empresa.entity';
import { Role } from '../auth/roles.enum';
import * as bcrypt from 'bcrypt';

describe('Cadastro com confirmação por e-mail', () => {
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

  it('consome o convite e cria o usuário somente ao confirmar o endereço', async () => {
    const pending = {
      email: 'aluno@example.com',
      name: 'Aluno',
      birth_date: '2016-05-01',
      nickname: null,
      kind: 'invite',
      invite_id: 5,
      expires_at: new Date(Date.now() + 3600000),
    };
    const invite = {
      id: 5,
      email: 'aluno@example.com',
      empresa_id: 8,
      role: Role.USER,
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

    await service.confirm('valid-token', 'segredo123');

    expect(inviteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ uses: 1 }),
    );
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'aluno@example.com',
        empresa_id: 8,
        role: Role.USER,
        birth_date: '2016-05-01',
        trial_ends_at: null,
        email_verified_at: expect.any(Date) as Date,
      }),
    );
    expect(pendingRepository.remove).toHaveBeenCalledWith(pending);
  });

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

    await expect(service.setPassword('token', 'nova-senha-segura')).resolves.toEqual(
      expect.objectContaining({ sucesso: true }),
    );
    expect(await bcrypt.compare('nova-senha-segura', user.password)).toBe(true);
    expect(user.password_change_required).toBe(false);
    expect(user.password_setup_token_hash).toBeNull();
    expect(userRepository.save).toHaveBeenCalledWith(user);
  });
});
