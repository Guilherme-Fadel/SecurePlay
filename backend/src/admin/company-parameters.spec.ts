import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PlatformAdminController } from './platform-admin.controller';
import { Empresa } from '../empresa/empresa.entity';
import { EmpresaParametrosAudit } from '../empresa/empresa-parametros-audit.entity';
import { resolveCompanyParameters } from '../config/features';
import { UpdateCompanyParametersDto } from './dto/update-company-parameters.dto';

describe('Administração de parâmetros da empresa', () => {
  it('grava layout e parâmetros com auditoria na mesma transação', async () => {
    const anterior = resolveCompanyParameters();
    const parametros = resolveCompanyParameters({ achievementsEnabled: true });
    const target = {
      id: 4,
      nome: 'Escola',
      parametros_funcionalidades: anterior,
    };
    const manager = {
      findOne: jest.fn().mockResolvedValue(target),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    const service = new AdminService(
      {} as never,
      {} as never,
      { transaction } as never,
      {} as never,
    );
    const result = await service.updateConfiguracoesDaEmpresa(4, 9, {
      nome: 'Escola piloto',
      parametros,
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      tema: { nome: 'Escola piloto' },
      parametros,
    });
    expect(manager.save).toHaveBeenCalledWith(EmpresaParametrosAudit, {
      empresa_id: 4,
      alterado_por_id: 9,
      anterior,
      atual: parametros,
    });
  });

  it('não gera auditoria de parâmetros ao alterar somente informações da empresa', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: 4,
          nome: 'Escola',
          parametros_funcionalidades: null,
        }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      { transaction: async (callback) => callback(manager) } as never,
      {} as never,
    );
    await service.updateConfiguracoesDaEmpresa(4, 9, { nome: 'Escola piloto' });
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('propaga falha de auditoria para impedir commit do salvamento integrado', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: 4,
          nome: 'Escola',
          parametros_funcionalidades: null,
        }),
      save: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('audit failed')),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      { transaction: async (callback) => callback(manager) } as never,
      {} as never,
    );
    await expect(
      service.updateConfiguracoesDaEmpresa(4, 9, {
        nome: 'Escola piloto',
        parametros: resolveCompanyParameters({ achievementsEnabled: true }),
      }),
    ).rejects.toThrow('audit failed');
  });
  it('grava parâmetros e auditoria na mesma transação, com autor autenticado', async () => {
    const anterior = resolveCompanyParameters();
    const atual = resolveCompanyParameters({
      rankingEnabled: false,
      enabledGames: [],
    });
    const empresa = { id: 4, parametros_funcionalidades: anterior };
    const manager = {
      findOne: jest.fn().mockResolvedValue(empresa),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    const service = new AdminService(
      {} as never,
      {} as never,
      { transaction } as never,
      {} as never,
    );

    expect(await service.updateParametrosDaEmpresa(4, 7, atual)).toEqual(atual);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(manager.findOne).toHaveBeenCalledWith(Empresa, {
      where: { id: 4 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.save).toHaveBeenCalledWith(Empresa, empresa);
    expect(manager.save).toHaveBeenCalledWith(EmpresaParametrosAudit, {
      empresa_id: 4,
      alterado_por_id: 7,
      anterior,
      atual,
    });
  });

  it('resolve a empresa do administrador para consulta sem permitir edição', async () => {
    const companyRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 4 }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({ empresa_id: 4 }),
    };
    const service = new AdminService(
      companyRepository as never,
      userRepository as never,
      {} as never,
      {} as never,
    );
    expect(await service.getParametros(7)).toEqual(resolveCompanyParameters());
    expect(companyRepository.findOne).toHaveBeenCalledWith({
      where: { id: 4 },
    });
    expect('updateParametros' in service).toBe(false);
  });

  it('encaminha as rotas próprias e globais com identidade e empresa corretas', async () => {
    const dto = resolveCompanyParameters();
    const service = {
      getParametros: jest.fn(),
      updateParametrosDaEmpresa: jest.fn(),
    };
    await new AdminController(service as never, {} as never).getParametros({
      user: { userId: 7 },
    });
    await new PlatformAdminController(
      service as never,
      {} as never,
    ).updateParametros(20, { user: { userId: 9 } }, dto);
    expect(service.getParametros).toHaveBeenCalledWith(7);
    expect(service.updateParametrosDaEmpresa).toHaveBeenCalledWith(20, 9, dto);
  });

  it('rejeita a transação se a escrita da auditoria falhar', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 4, parametros_funcionalidades: null }),
      save: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('audit failed')),
    };
    const service = new AdminService(
      {} as never,
      {} as never,
      { transaction: async (callback) => callback(manager) } as never,
      {} as never,
    );
    await expect(
      service.updateParametrosDaEmpresa(4, 7, resolveCompanyParameters()),
    ).rejects.toThrow('audit failed');
  });

  it.each([
    { rankingEnabled: 'false' },
    { achievementsEnabled: null },
    { enabledGames: ['unknown-game'] },
    { enabledGames: ['termotech', 'termotech'] },
  ])('rejeita parâmetros inválidos: %j', async (overrides) => {
    const dto = plainToInstance(UpdateCompanyParametersDto, {
      ...resolveCompanyParameters(),
      ...overrides,
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('aceita desabilitar todos os jogos sem excluir dados', async () => {
    const dto = plainToInstance(
      UpdateCompanyParametersDto,
      resolveCompanyParameters({ enabledGames: [] }),
    );
    expect(await validate(dto)).toEqual([]);
  });
});
