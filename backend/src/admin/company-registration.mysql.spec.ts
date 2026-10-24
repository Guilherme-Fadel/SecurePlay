import { DataSource } from 'typeorm';
import { Empresa } from '../empresa/empresa.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from '../auth/roles.enum';
import { Convite } from './entities/convite.entity';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';
import { CompanyRegistration } from './entities/company-registration.entity';
import { AdminService } from './admin.service';
import { CompanyRegistrationService } from './company-registration.service';
import { saveRegistration } from './company-registration';
import { CreateCompanyRegistration1793145600000 } from '../database/migrations/1793145600000-create-company-registration';

jest.mock('../dashboard/ranking-history', () => ({
  ensurePendingRankingSeasonsClosed: jest.fn().mockResolvedValue(undefined),
}));

// Opt-in. Somente container descartável criado para esta suíte. Nunca carrega .env.
const isolated =
  process.env.RUN_COMPANY_MYSQL_TESTS === '1' ? describe : describe.skip;
isolated('Cadastro institucional — MySQL descartável', () => {
  let source: DataSource;
  let admin: AdminService;
  let registration: CompanyRegistrationService;
  let actorId: number;
  let legacyId: number;
  let schoolAdminId: number;
  let createdId: number;
  const data = {
    razao_social: 'Instituição Fixture',
    cnpj: '12.ABC.345/01DE-35',
    unidade: 'Centro',
    contato_nome: 'Contato Fixture',
    contato_email: 'contato@example.test',
    cep: '01310-100',
    logradouro: 'Rua Fixture',
    numero: 'S/N',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
  };
  const migration = new CreateCompanyRegistration1793145600000();
  beforeAll(async () => {
    const port = Number(process.env.LOCAL_COMPANY_MYSQL_PORT);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new Error('Informe a porta do container descartável');
    const options = {
      type: 'mysql' as const,
      host: '127.0.0.1',
      port,
      username: 'root',
      password: 'company-fixture-only',
      database: 'company_registration_fixture',
      logging: false as const,
    };
    const entities = [Empresa, Usuario, Convite, AdminAuditEvent];
    const base = await new DataSource({
      ...options,
      entities,
      synchronize: true,
    }).initialize();
    const legacy = await base
      .getRepository(Empresa)
      .save({ nome: 'Escola Legada' });
    legacyId = legacy.id;
    const users = base.getRepository(Usuario);
    const actor = await users.save({
      name: 'Plataforma Fixture',
      password: 'fixture-not-used-for-auth',
      role: Role.PLATFORM_ADMIN,
      active: true,
    });
    actorId = actor.id;
    const schoolAdmin = await users.save({
      name: 'Admin Fixture',
      password: 'fixture-not-used-for-auth',
      role: Role.ADMIN,
      active: true,
      empresa_id: legacyId,
    });
    schoolAdminId = schoolAdmin.id;
    await base.destroy();
    source = await new DataSource({
      ...options,
      entities: [...entities, CompanyRegistration],
      synchronize: false,
    }).initialize();
    const runner = source.createQueryRunner();
    try {
      await migration.up(runner);
      await migration.down(runner);
      await migration.up(runner);
    } finally {
      await runner.release();
    }
    admin = new AdminService(
      source.getRepository(Empresa),
      source.getRepository(Usuario),
      source,
      {} as never,
    );
    registration = new CompanyRegistrationService(source);
  }, 60000);
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });

  it('up/down/up preserva empresa e sessão legadas sem preencher cadastro', async () => {
    await expect(registration.own(schoolAdminId)).resolves.toMatchObject({
      empresa_id: legacyId,
      completo: false,
      cadastro: { cnpj: null },
    });
    expect(await source.getRepository(CompanyRegistration).count()).toBe(0);
    const runner = source.createQueryRunner();
    try {
      const table = await runner.getTable('company_registration');
      expect(table?.indices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            isUnique: true,
            columnNames: ['cnpj', 'unidade'],
          }),
        ]),
      );
    } finally {
      await runner.release();
    }
  });
  it('cria empresa, cadastro normalizado, auditoria e convite admin juntos', async () => {
    const result = await admin.criarEmpresa(
      'Escola Centro',
      'admin.centro@example.test',
      actorId,
      data,
    );
    createdId = result.empresa.id;
    expect(result.token).toHaveLength(43);
    expect(result.empresa).not.toHaveProperty('cnpj');
    const view = await registration.platform(actorId, createdId);
    expect(view).toMatchObject({
      completo: true,
      cadastro: { cnpj: '12ABC34501DE35', cep: '01310100', unidade: 'Centro' },
    });
    expect(
      await source.getRepository(Convite).findOneBy({ empresa_id: createdId }),
    ).toMatchObject({ role: Role.ADMIN, max_uses: 1, uses: 0 });
    const audit = await source
      .getRepository(AdminAuditEvent)
      .findOneBy({ empresa_id: createdId });
    expect(JSON.stringify(audit?.detalhes)).not.toContain(
      'contato@example.test',
    );
  });
  it('mesmo CNPJ permite outra unidade sem compartilhar dados ou acesso', async () => {
    const result = await admin.criarEmpresa(
      'Escola Norte',
      'admin.norte@example.test',
      actorId,
      { ...data, unidade: 'Norte' },
    );
    expect(result.empresa.id).not.toBe(createdId);
    await expect(registration.own(schoolAdminId)).resolves.toMatchObject({
      empresa_id: legacyId,
      cadastro: { cnpj: null },
    });
    await expect(
      registration.findCnpj(actorId, data.cnpj),
    ).resolves.toHaveLength(2);
    await expect(
      registration.findCnpj(schoolAdminId, data.cnpj),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('duplicidade case-insensitive falha sem empresa órfã ou novo convite', async () => {
    const before = await source.getRepository(Empresa).count();
    const invites = await source.getRepository(Convite).count();
    await expect(
      admin.criarEmpresa('Duplicada Fixture', 'dup@example.test', actorId, {
        ...data,
        unidade: ' centro ',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await source.getRepository(Empresa).count()).toBe(before);
    expect(await source.getRepository(Convite).count()).toBe(invites);
  });
  it('concorrência de uma unidade confirma somente um cadastro', async () => {
    const before = await source.getRepository(Empresa).count();
    const results = await Promise.allSettled([
      admin.criarEmpresa('Concorrente A', 'race.a@example.test', actorId, {
        ...data,
        unidade: 'Concorrente',
      }),
      admin.criarEmpresa('Concorrente B', 'race.b@example.test', actorId, {
        ...data,
        unidade: 'Concorrente',
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409 });
    expect(await source.getRepository(Empresa).count()).toBe(before + 1);
  });
  it('falha de auditoria reverte cadastro e criação na mesma transação', async () => {
    const before = await source.getRepository(Empresa).count();
    await expect(
      admin.criarEmpresa('Falha Fixture', 'failure@example.test', 2147483647, {
        ...data,
        unidade: 'Falha',
      }),
    ).rejects.toThrow();
    expect(await source.getRepository(Empresa).count()).toBe(before);
    expect(
      await source
        .getRepository(CompanyRegistration)
        .findOneBy({ unidade: 'Falha' }),
    ).toBeNull();
  });
  it('erro após alteração reverte contato e auditoria sem mexer no restante', async () => {
    const before = await source.getRepository(AdminAuditEvent).count();
    await expect(
      source.transaction(async (manager) => {
        await saveRegistration(manager, createdId, actorId, {
          contato_nome: 'Não deve persistir',
        });
        throw new Error('Rollback Fixture');
      }),
    ).rejects.toThrow('Rollback Fixture');
    expect(
      (await registration.platform(actorId, createdId)).cadastro.contato_nome,
    ).toBe('Contato Fixture');
    expect(await source.getRepository(AdminAuditEvent).count()).toBe(before);
  });
  it('edição parcial de legado é permitida e não vaza para tema', async () => {
    await admin.updateConfiguracoesDaEmpresa(legacyId, actorId, {
      cadastro: { contato_nome: 'Responsável legado' },
    });
    await expect(registration.own(schoolAdminId)).resolves.toMatchObject({
      completo: false,
      cadastro: { contato_nome: 'Responsável legado' },
    });
    const theme = await admin.getTema(schoolAdminId);
    expect(theme).not.toHaveProperty('cadastro');
    expect(theme).not.toHaveProperty('contato_nome');
  });
  it('down recusa remover cadastro preenchido', async () => {
    const runner = source.createQueryRunner();
    try {
      await expect(migration.down(runner)).rejects.toThrow(
        'Rollback bloqueado',
      );
    } finally {
      await runner.release();
    }
    expect(
      await source.getRepository(CompanyRegistration).count(),
    ).toBeGreaterThan(0);
  });
});
