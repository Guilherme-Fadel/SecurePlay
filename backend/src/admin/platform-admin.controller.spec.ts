import { AdminController } from './admin.controller';
import { PlatformAdminController } from './platform-admin.controller';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

describe('Administração global e por empresa', () => {
  it('mantém as rotas de empresa exclusivas para admin', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminController)).toEqual([
      Role.ADMIN,
    ]);
  });

  it('protege o namespace global com platform_admin', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlatformAdminController)).toEqual([
      Role.PLATFORM_ADMIN,
    ]);
  });

  it('encaminha a criação global de convite com empresa-alvo explícita', async () => {
    const convitesService = {
      criarParaEmpresa: jest.fn().mockResolvedValue({}),
    };
    const controller = new PlatformAdminController(
      {} as never,
      convitesService as never,
    );
    const dto = { email: 'pessoa@empresa.com', validade_dias: 7, max_uses: 1 };

    await controller.criarConvite(14, dto, { user: { userId: 9 } });

    expect(convitesService.criarParaEmpresa).toHaveBeenCalledWith(
      14,
      9,
      dto,
      Role.USER,
    );
  });

  it('cria convite de administrador apenas quando a flag da rota global é marcada', async () => {
    const convitesService = {
      criarParaEmpresa: jest.fn().mockResolvedValue({}),
    };
    const controller = new PlatformAdminController(
      {} as never,
      convitesService as never,
    );
    const dto = {
      email: 'admin@empresa.com',
      validade_dias: 7,
      max_uses: 1,
      administrador: true,
    };

    await controller.criarConvite(14, dto, { user: { userId: 9 } });

    expect(convitesService.criarParaEmpresa).toHaveBeenCalledWith(
      14,
      9,
      dto,
      Role.ADMIN,
    );
  });

  it('permite cadastrar empresa somente pelo serviço global', async () => {
    const adminService = {
      criarEmpresa: jest.fn().mockResolvedValue({ id: 15 }),
    };
    const controller = new PlatformAdminController(
      adminService as never,
      {} as never,
    );

    await controller.criarEmpresa(
      { nome: 'Empresa Nova', email_administrador: 'admin@empresa.com' },
      { user: { userId: 9 } },
    );

    expect(adminService.criarEmpresa).toHaveBeenCalledWith(
      'Empresa Nova',
      'admin@empresa.com',
      9,
    );
  });
});
