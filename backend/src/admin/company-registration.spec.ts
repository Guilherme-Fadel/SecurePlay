import {
  normalizeCnpj,
  validCnpj,
  normalizeRegistration,
  emptyRegistration,
  saveRegistration,
  registrationConflict,
} from './company-registration';
import { CompanyRegistrationService } from './company-registration.service';
import { Table } from 'typeorm';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Empresa } from '../empresa/empresa.entity';
import { Role } from '../auth/roles.enum';
import { CreateCompanyRegistration1793145600000 } from '../database/migrations/1793145600000-create-company-registration';

describe('Cadastro institucional — validação e compatibilidade', () => {
  it.each([
    '11.222.333/0001-81',
    '11222333000181',
    '12.ABC.345/01DE-35',
    '12.abc.345/01de-35',
  ])('valida DV numérico/alfanumérico %s', (value) =>
    expect(validCnpj(value)).toBe(true),
  );
  it.each([
    '00000000000000',
    '11111111111111',
    '11222333000182',
    '12ABC34501DE36',
    '12ABC34501DE3A',
    '12ABC34501DÉ35',
    '12ABC34501DE',
  ])('rejeita %s', (value) => expect(validCnpj(value)).toBe(false));
  it('normaliza formato sem descartar caracteres arbitrários', () => {
    expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(() => normalizeRegistration({ cnpj: '12!ABC34501DE35' })).toThrow();
    expect(
      normalizeRegistration({
        contato_email: ' ADMIN@example.test ',
        contato_telefone: '(11) 99999-0000',
        cep: '01310-100',
        uf: 'sp',
        unidade: ' Centro   Sul ',
      }),
    ).toEqual({
      contato_email: 'admin@example.test',
      contato_telefone: '11999990000',
      cep: '01310100',
      uf: 'SP',
      unidade: 'Centro Sul',
    });
  });
  it.each([
    { uf: 'XX' },
    { cep: '12345' },
    { contato_email: 'incorreto' },
    { contato_telefone: '123abc' },
    { unidade: 31 },
    { empresa_id: 31 },
  ])('rejeita campo inválido ou mass assignment', (value) => {
    expect(() => normalizeRegistration(value as never)).toThrow();
  });
  it('exige cadastro completo na criação e permite legado parcial/limpeza explícita', () => {
    expect(() => normalizeRegistration({ unidade: 'Centro' }, true)).toThrow();
    expect(
      normalizeRegistration({ complemento: null, contato_nome: undefined }),
    ).toEqual({ complemento: null });
    expect(() =>
      normalizeRegistration({ contato_nome: 'A'.repeat(101) }),
    ).toThrow();
  });
});

describe('Cadastro institucional — isolamento e gravação', () => {
  const setup = (role = Role.ADMIN, active = true) => {
    const user = { id: 2, role, active, empresa_id: 10 };
    const registration = {
      empresa_id: 10,
      ...emptyRegistration(),
      contato_nome: 'Responsável',
    };
    const registrations = {
      findOne: jest.fn().mockResolvedValue(registration),
      find: jest.fn().mockResolvedValue([registration]),
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(),
    };
    const companies = {
      findOne: jest.fn().mockResolvedValue({ id: 10, nome: 'Escola' }),
    };
    const source = {
      getRepository: (entity: unknown) =>
        entity === Usuario
          ? { findOne: jest.fn().mockResolvedValue(user) }
          : entity === Empresa
            ? companies
            : registrations,
    };
    return {
      service: new CompanyRegistrationService(source as never),
      registrations,
      companies,
      registration,
    };
  };
  it('consulta própria usa vínculo da sessão, sem ID recebido do cliente', async () => {
    const { service, companies, registrations } = setup();
    await expect(service.own(2)).resolves.toMatchObject({
      empresa_id: 10,
      cadastro: { contato_nome: 'Responsável' },
      completo: false,
    });
    expect(companies.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(registrations.findOne).toHaveBeenCalledWith({
      where: { empresa_id: 10 },
    });
  });
  it.each([Role.USER, Role.PLATFORM_ADMIN])(
    'consulta própria rejeita %s',
    async (role) => {
      await expect(setup(role).service.own(2)).rejects.toMatchObject({
        status: 403,
      });
    },
  );
  it('rejeita conta inativa e consulta global por admin', async () => {
    await expect(setup(Role.ADMIN, false).service.own(2)).rejects.toMatchObject(
      { status: 403 },
    );
    await expect(setup().service.platform(2, 20)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      setup().service.findCnpj(2, '11222333000181'),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('legado ausente permanece incompleto sem gravação', async () => {
    const { service, registrations } = setup();
    registrations.findOne.mockResolvedValue(null);
    await expect(service.own(2)).resolves.toMatchObject({
      completo: false,
      cadastro: emptyRegistration(),
    });
    expect(registrations.save).not.toHaveBeenCalled();
  });
  it('grava mudança parcial e auditoria sem copiar dados pessoais', async () => {
    const { registrations, registration } = setup();
    const manager = { getRepository: () => registrations, save: jest.fn() };
    await saveRegistration(
      manager as never,
      10,
      2,
      { contato_nome: 'Novo responsável' },
      'Escola',
      'Escola Sul',
    );
    expect(registrations.save).toHaveBeenCalledWith(
      expect.objectContaining({
        empresa_id: 10,
        contato_nome: 'Novo responsável',
        cnpj: registration.cnpj,
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      AdminAuditEvent,
      expect.objectContaining({
        detalhes: { campos_alterados: ['nome', 'contato_nome'] },
        ator_id: 2,
        empresa_id: 10,
      }),
    );
  });
  it('não escreve pedido idêntico e propaga falha de auditoria', async () => {
    const { registrations } = setup();
    const manager = { getRepository: () => registrations, save: jest.fn() };
    await saveRegistration(manager as never, 10, 2, {
      contato_nome: 'Responsável',
    });
    expect(registrations.save).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
    manager.save.mockRejectedValue(new Error('Auditoria indisponível'));
    await expect(
      saveRegistration(manager as never, 10, 2, { contato_nome: 'Novo' }),
    ).rejects.toThrow('Auditoria indisponível');
  });
  it('rejeita CNPJ sem unidade e conflito sem expor SQL', async () => {
    const { registrations } = setup();
    const manager = { getRepository: () => registrations, save: jest.fn() };
    await expect(
      saveRegistration(manager as never, 10, 2, { cnpj: '11222333000181' }),
    ).rejects.toMatchObject({ status: 400 });
    expect(() =>
      registrationConflict({
        code: 'ER_DUP_ENTRY',
        message: 'Duplicate key ux_company_registration_unit',
      }),
    ).toThrow('Já existe uma unidade');
    expect(() =>
      registrationConflict({
        code: 'ER_BAD_FIELD_ERROR',
        message: 'SQL com contato privado',
      }),
    ).toThrow('Não foi possível salvar os dados cadastrais');
    expect(registrations.save).not.toHaveBeenCalled();
  });
});

describe('Migração aditiva cadastral', () => {
  it('cria tabela privada nullable com índice por CNPJ/unidade, preservando empresa', async () => {
    const runner = {
      hasTable: jest.fn().mockResolvedValue(false),
      createTable: jest.fn((table: Table) => Promise.resolve(table)),
    };
    await new CreateCompanyRegistration1793145600000().up(runner as never);
    const table = runner.createTable.mock.calls[0][0];
    expect(table.name).toBe('company_registration');
    expect(table.indices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isUnique: true,
          columnNames: ['cnpj', 'unidade'],
        }),
      ]),
    );
    expect(
      table.columns
        .filter(
          (column: { name: string }) =>
            !['empresa_id', 'updated_at'].includes(column.name),
        )
        .every((column: { isNullable: boolean }) => column.isNullable),
    ).toBe(true);
  });
  it('rollback bloqueia dados existentes e permite reaplicação vazia', async () => {
    const runner = {
      hasTable: jest.fn().mockResolvedValue(true),
      query: jest.fn().mockResolvedValue([{ empresa_id: 10 }]),
      dropTable: jest.fn(),
      createTable: jest.fn(),
    };
    const migration = new CreateCompanyRegistration1793145600000();
    await expect(migration.down(runner as never)).rejects.toThrow(
      'Rollback bloqueado',
    );
    expect(runner.dropTable).not.toHaveBeenCalled();
    runner.query.mockResolvedValue([]);
    await migration.down(runner as never);
    expect(runner.dropTable).toHaveBeenCalledWith('company_registration');
    await migration.up(runner as never);
    expect(runner.createTable).not.toHaveBeenCalled();
  });
});
