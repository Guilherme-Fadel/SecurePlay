import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegistrationService } from './registration.service';
import { PendingRegistration } from './pending-registration.entity';
import { CompleteCadastroConviteDto } from '../admin/dto/complete-cadastro-convite.dto';
import { Convite } from '../admin/entities/convite.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from '../auth/roles.enum';
import { normalizePhone, normalizeUsername } from '../usuario/login-identity';
import * as bcrypt from 'bcrypt';

jest.mock('../dashboard/ranking-history', () => ({
  ensurePendingRankingSeasonsClosed: jest.fn().mockResolvedValue(undefined),
}));

function setup() {
  const invite = {
    id: 1,
    role: Role.USER,
    registration_mode: 'school_student',
    email: null,
    empresa_id: 8,
    uses: 0,
    max_uses: 1,
    revoked: false,
    expires_at: new Date(Date.now() + 3600000),
  };
  const pending = {
    email: 'aluno@example.test',
    username: 'aluno.teste',
    phone: '+5511999999999',
    name: 'Aluno',
    birth_date: null,
    kind: 'invite',
    invite_id: 1,
    expires_at: new Date(Date.now() + 3600000),
  };
  const locked = (value: unknown) => ({
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(value),
  });
  const users = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((value: Partial<Usuario>) => value),
    save: jest.fn((value: Partial<Usuario>) => Promise.resolve(value)),
  };
  const invites = {
    findOne: jest.fn().mockResolvedValue(invite),
    createQueryBuilder: jest.fn(() => locked(invite)),
    save: jest.fn((value: Partial<Convite>) => Promise.resolve(value)),
  };
  const pendings = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn(() => ({})),
    createQueryBuilder: jest.fn(() => locked(pending)),
    save: jest.fn((value: Partial<PendingRegistration>) =>
      Promise.resolve(value),
    ),
    remove: jest.fn(),
  };
  const getRepository = (entity: unknown) =>
    entity === Convite
      ? invites
      : entity === PendingRegistration
        ? pendings
        : users;
  const dataSource = {
    getRepository,
    transaction: jest.fn((work: (manager: unknown) => unknown) =>
      work({ getRepository }),
    ),
  };
  const email = { sendVerification: jest.fn().mockResolvedValue(undefined) };
  return {
    service: new RegistrationService(dataSource as never, email as never),
    invite,
    pending,
    users,
    invites,
    pendings,
    email,
  };
}

describe('Usuário de acesso por convite', () => {
  it('normaliza contato, preservando a diferença entre ponto, hífen e sublinhado', () => {
    expect(normalizeUsername(' Joao.Silva ')).toBe('joao.silva');
    expect(
      new Set(['joao.silva', 'joao-silva', 'joao_silva'].map(normalizeUsername))
        .size,
    ).toBe(3);
    expect(normalizePhone('+55 (11) 99999-9999')).toBe('+5511999999999');
  });
  it.each([
    'ab',
    'SP-123',
    'joão',
    'nome@teste',
    'nome com espaço',
    'a'.repeat(25),
  ])('rejeita usuário inválido %s', (value) => {
    expect(() => normalizeUsername(value)).toThrow();
    expect(
      validateSync(
        plainToInstance(CompleteCadastroConviteDto, {
          name: 'Aluno',
          username: value,
        }),
      ).some((error) => error.property === 'username'),
    ).toBe(true);
  });
  it('DTO normaliza username/telefone e não aceita telefone como objeto', () => {
    const dto = plainToInstance(CompleteCadastroConviteDto, {
      name: 'Aluno',
      username: ' ALUNO.Teste ',
      phone: '+55 (11) 99999-9999',
    });
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      username: 'aluno.teste',
      phone: '+5511999999999',
    });
    expect(
      validateSync(
        plainToInstance(CompleteCadastroConviteDto, {
          name: 'Aluno',
          phone: {},
        }),
      ).some((error) => error.property === 'phone'),
    ).toBe(true);
  });
  it('exige usuário sem e-mail e não consome o convite na rejeição', async () => {
    const { service, invites, users } = setup();
    await expect(
      service.startInvite('token', { name: 'Aluno', password: 'segredo123' }),
    ).rejects.toThrow('Escolha um usuário');
    expect(invites.save).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
  });
  it('recusa duplicado global sem gerar conta nem consumir convite', async () => {
    const { service, users, invites } = setup();
    users.findOne.mockResolvedValue({ id: 99, empresa_id: 33 } as never);
    await expect(
      service.startInvite('token', {
        name: 'Aluno',
        username: 'ALUNO.Teste',
        password: 'segredo123',
      }),
    ).rejects.toMatchObject({ response: { code: 'USERNAME_TAKEN' } });
    expect(users.findOne).toHaveBeenCalledWith({
      where: { username: 'aluno.teste' },
    });
    expect(users.save).not.toHaveBeenCalled();
    expect(invites.save).not.toHaveBeenCalled();
  });
  it('traduz corrida rejeitada pelo índice único e não salva o consumo do convite', async () => {
    const { service, users, invites } = setup();
    users.save.mockRejectedValue({
      code: 'ER_DUP_ENTRY',
      sqlMessage: "Duplicate entry for key 'ux_usuario_username'",
    });
    await expect(
      service.startInvite('token', {
        name: 'Aluno',
        username: 'aluno.teste',
        password: 'segredo123',
      }),
    ).rejects.toMatchObject({ response: { code: 'USERNAME_TAKEN' } });
    expect(invites.save).not.toHaveBeenCalled();
  });
  it.each([{ revoked: true }, { uses: 1 }, { expires_at: new Date(0) }])(
    'recusa convite indisponível %p',
    async (patch) => {
      const { service, invite, users } = setup();
      Object.assign(invite, patch);
      await expect(
        service.startInvite('token', {
          name: 'Aluno',
          username: 'aluno.teste',
          password: 'segredo123',
        }),
      ).rejects.toThrow('Convite inválido');
      expect(users.save).not.toHaveBeenCalled();
    },
  );
  it('com e-mail cria pendência sem senha nem data e só consome convite na confirmação', async () => {
    const { service, users, invites, pendings, email } = setup();
    await service.startInvite('token', {
      name: 'Aluno',
      email: 'ALUNO@example.test',
      username: 'Aluno.Teste',
      phone: '(11) 99999-9999',
    });
    expect(pendings.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'aluno@example.test',
        username: 'aluno.teste',
        phone: '11999999999',
        birth_date: null,
        invite_id: 1,
      }),
    );
    expect(users.save).not.toHaveBeenCalled();
    expect(invites.save).not.toHaveBeenCalled();
    expect(email.sendVerification).toHaveBeenCalled();
    expect(users.findOne).toHaveBeenCalledTimes(1);
    expect(users.findOne).toHaveBeenCalledWith({
      where: { email: 'aluno@example.test' },
    });
    await service.confirm('email-token');
    const created = users.create.mock.calls[0][0];
    expect(created).toMatchObject({
      username: 'aluno.teste',
      phone: '+5511999999999',
      password_change_required: true,
      empresa_id: 8,
      role: Role.USER,
    });
    expect(created.email_verified_at).toBeInstanceOf(Date);
    expect(invites.save).toHaveBeenCalledWith(
      expect.objectContaining({ uses: 1 }),
    );
  });
  it('conflito na confirmação preserva pendência e permite novo usuário com o mesmo token', async () => {
    const { service, users, pendings, invites } = setup();
    users.findOne.mockImplementation(
      ({ where }: { where: { username?: string } }) =>
        Promise.resolve(where.username === 'aluno.teste' ? { id: 99 } : null),
    );
    await expect(service.confirm('email-token')).rejects.toMatchObject({
      response: { code: 'USERNAME_TAKEN' },
    });
    expect(pendings.remove).not.toHaveBeenCalled();
    expect(invites.save).not.toHaveBeenCalled();
    await service.confirm('email-token', 'Outro.Aluno');
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'outro.aluno' }),
    );
    expect(pendings.remove).toHaveBeenCalled();
  });
  it('não cria conta com e-mail escolar antes da confirmação mesmo com senha fornecida', async () => {
    const { service, users } = setup();
    await expect(
      service.startInvite('token', {
        name: 'Aluno',
        email: 'aluno@example.test',
        password: 'segredo123',
      }),
    ).rejects.toThrow('Confirme seu e-mail');
    expect(users.save).not.toHaveBeenCalled();
  });
  it('redefine senha de username sem e-mail com token único e invalida sessão', async () => {
    const user = {
      id: 2,
      username: 'aluno.teste',
      login_code: null,
      email: null,
      role: Role.USER,
      active: true,
      password: '',
      session_version: 1,
      password_reset_token_hash: 'hash',
      password_reset_expires_at: new Date(Date.now() + 60000),
    };
    const query = {
      setLock: () => query,
      where: () => query,
      getOne: () =>
        Promise.resolve(user.password_reset_token_hash ? user : null),
    };
    const repository = {
      createQueryBuilder: () => query,
      save: jest.fn((value: typeof user) => Promise.resolve(value)),
    };
    const service = new RegistrationService(
      {
        transaction: (work: (manager: unknown) => unknown) =>
          work({ getRepository: () => repository }),
      } as never,
      {} as never,
    );
    await expect(
      service.resetPassword('token', 'nova-senha'),
    ).resolves.toMatchObject({ username: 'aluno.teste', login_code: null });
    expect(await bcrypt.compare('nova-senha', user.password)).toBe(true);
    expect(user.session_version).toBe(2);
    await expect(service.resetPassword('token', 'outra-senha')).rejects.toThrow(
      'Link de recuperação inválido',
    );
  });
});
