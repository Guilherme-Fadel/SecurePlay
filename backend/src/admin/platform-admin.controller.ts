import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { AdminService } from './admin.service';
import { ConvitesService } from './convites.service';
import { CreateConviteDto } from './dto/create-convite.dto';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { PresignLogoDto } from './dto/presign-logo.dto';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { UpdateCompanyParametersDto } from './dto/update-company-parameters.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { AdminAuditService } from './admin-audit.service';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { SaveSchoolPilotDto } from './dto/school-pilot.dto';
import { SchoolPilotService } from './school-pilot.service';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

type AdminRequest = { user: { userId: number } };

@Controller('platform/admin')
@Roles(Role.PLATFORM_ADMIN)
export class PlatformAdminController {
  @Get('usuarios/:usuarioId')
  async obterPropriosDados(
    @Request() req: AdminRequest,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.convitesService.obterPropriosDadosPlataforma(
      req.user.userId,
      usuarioId,
    );
  }

  @Put('usuarios/:usuarioId')
  async atualizarPropriosDados(
    @Request() req: AdminRequest,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: UpdateAdminUserDto,
  ) {
    await this.convitesService.obterPropriosDadosPlataforma(
      req.user.userId,
      usuarioId,
    );
    return this.convitesService.atualizarUsuario(
      req.user.userId,
      usuarioId,
      dto,
    );
  }
  @Put('empresas/:empresaId/usuarios/:usuarioId')
  async atualizarUsuario(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.convitesService.atualizarUsuario(
      req.user.userId,
      usuarioId,
      dto,
      empresaId,
    );
  }
  constructor(
    private readonly adminService: AdminService,
    private readonly convitesService: ConvitesService,
    private readonly adminAuditService: AdminAuditService,
    private readonly schoolPilotService: SchoolPilotService,
  ) {}

  @Get('empresas')
  async listarEmpresas() {
    return this.adminService.listarEmpresas();
  }

  @Get('empresas/paginadas')
  async listarEmpresasPaginadas(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.adminService.listarEmpresasPaginadas({
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      sort,
    });
  }

  @Get('empresas/:empresaId/pilotos')
  async listarPilotosDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.schoolPilotService.list(empresaId);
  }

  @Get('empresas/:empresaId/pilotos/paginados')
  async pilotosPaginados(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('page') page?: string,
  ) {
    return this.schoolPilotService.listPage(empresaId, Number(page));
  }

  @Get('empresas/:empresaId/pilotos/contatos')
  async contatosDosPilotos(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.schoolPilotService.contacts(empresaId, search, Number(page));
  }

  @Get('empresas/:empresaId/pilotos/:pilotId')
  async detalheDoPiloto(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('pilotId', ParseIntPipe) pilotId: number,
  ) {
    return this.schoolPilotService.detail(empresaId, pilotId);
  }

  @Post('empresas/:empresaId/pilotos')
  async criarPilotoDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Request() req: AdminRequest,
    @Body() dto: SaveSchoolPilotDto,
  ) {
    return this.schoolPilotService.create(empresaId, req.user.userId, dto);
  }

  @Put('empresas/:empresaId/pilotos/:pilotId')
  async atualizarPilotoDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('pilotId', ParseIntPipe) pilotId: number,
    @Request() req: AdminRequest,
    @Body() dto: SaveSchoolPilotDto,
  ) {
    return this.schoolPilotService.update(
      empresaId,
      pilotId,
      req.user.userId,
      dto,
    );
  }

  @Post('empresas')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async criarEmpresa(
    @Body() dto: CreateEmpresaDto,
    @Request() req: AdminRequest,
  ) {
    return this.adminService.criarEmpresa(
      dto.nome,
      dto.email_administrador,
      req.user.userId,
      dto.cadastro,
    );
  }

  @Get('usuarios')
  async listarUsuariosGlobais() {
    return this.adminService.listarUsuariosGlobais();
  }

  @Post('usuarios/:usuarioId/inativar')
  async inativarUsuarioGlobal(
    @Request() req: AdminRequest,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: ChangeUserStatusDto,
  ) {
    return this.convitesService.inativarUsuarioGlobal(
      req.user.userId,
      usuarioId,
      dto.motivo,
    );
  }

  @Post('usuarios/:usuarioId/reativar')
  async reativarUsuarioGlobal(
    @Request() req: AdminRequest,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: ChangeUserStatusDto,
  ) {
    return this.convitesService.reativarUsuarioGlobal(
      req.user.userId,
      usuarioId,
      dto.motivo,
    );
  }

  @Get('empresas/:empresaId/tema')
  async getTema(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.adminService.getTemaDaEmpresa(empresaId);
  }

  @Get('empresas/:empresaId/parametros')
  async getParametros(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.adminService.getParametrosDaEmpresa(empresaId);
  }

  @Get('empresas/:empresaId/auditoria')
  async listarAuditoriaDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.listarAuditoriaDaEmpresa(empresaId, {
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('empresas/:empresaId/auditoria/eventos')
  async listarEventosAuditoriaDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminAuditService.listarDaEmpresa(
      empresaId,
      Number(page) || 1,
      Number(pageSize) || 25,
    );
  }

  @Put('empresas/:empresaId/parametros')
  async updateParametros(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Request() req: AdminRequest,
    @Body() dto: UpdateCompanyParametersDto,
  ) {
    return this.adminService.updateParametrosDaEmpresa(
      empresaId,
      req.user.userId,
      dto,
    );
  }

  @Put('empresas/:empresaId/tema')
  async updateTema(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: UpdateTemaDto,
  ) {
    return this.adminService.updateTemaDaEmpresa(empresaId, dto);
  }

  @Put('empresas/:empresaId/configuracoes')
  async updateConfiguracoes(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Request() req: AdminRequest,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    return this.adminService.updateConfiguracoesDaEmpresa(
      empresaId,
      req.user.userId,
      dto,
    );
  }

  @Post('empresas/:empresaId/logo/presign')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async presignLogo(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: PresignLogoDto,
  ) {
    return this.adminService.presignLogoDaEmpresa(empresaId, dto.contentType);
  }

  @Get('empresas/:empresaId/usuarios')
  async listarUsuariosDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'management',
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.convitesService.listarUsuariosPaginadosDaEmpresa(empresaId, {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      status,
      sort,
    });
  }

  @Get('empresas/:empresaId/usuarios/:usuarioId')
  async obterUsuarioDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.convitesService.obterUsuarioDaEmpresa(empresaId, usuarioId);
  }

  @Get('empresas/:empresaId/resumo')
  async obterResumoDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.convitesService.obterResumoAdministrativoDaEmpresa(empresaId);
  }

  @Get('empresas/:empresaId/apelidos-pendentes')
  async listarApelidosPendentesDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'default' | 'asc' | 'desc',
  ) {
    return this.convitesService.listarApelidosPendentesDaEmpresa(empresaId, {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      sort,
    });
  }

  @Get('empresas/:empresaId/convites')
  async listarConvitesDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.convitesService.listarDaEmpresa(empresaId);
  }

  @Get('empresas/:empresaId/convites/paginados')
  async listarConvitesPaginadosDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.convitesService.listarPaginadosDaEmpresa(empresaId, {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      sort,
    });
  }

  @Post('empresas/:empresaId/convites')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async criarConvite(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: CreateConviteDto,
    @Request() req: AdminRequest,
  ) {
    return this.convitesService.criarParaEmpresa(
      empresaId,
      req.user.userId,
      dto,
      dto.administrador ? Role.ADMIN : Role.USER,
    );
  }

  @Post('empresas/:empresaId/convites/:conviteId/revogar')
  async revogarConvite(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('conviteId', ParseIntPipe) conviteId: number,
    @Request() req: AdminRequest,
  ) {
    return this.convitesService.revogarDaEmpresa(
      empresaId,
      conviteId,
      req.user.userId,
    );
  }

  @Post('empresas/:empresaId/usuarios/:usuarioId/apelido/aprovar')
  async aprovarApelido(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Request() req: AdminRequest,
  ) {
    return this.convitesService.aprovarApelidoDaEmpresa(
      empresaId,
      usuarioId,
      req.user.userId,
    );
  }

  @Post('empresas/:empresaId/usuarios/:usuarioId/apelido/rejeitar')
  async rejeitarApelido(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Request() req: AdminRequest,
  ) {
    return this.convitesService.rejeitarApelidoDaEmpresa(
      empresaId,
      usuarioId,
      req.user.userId,
    );
  }

  @Post('empresas/:empresaId/usuarios/:usuarioId/inativar')
  async inativarUsuarioDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Request() req: AdminRequest,
    @Body() dto: ChangeUserStatusDto,
  ) {
    return this.convitesService.inativarUsuarioDaEmpresa(
      empresaId,
      req.user.userId,
      usuarioId,
      dto.motivo,
    );
  }

  @Post('empresas/:empresaId/usuarios/:usuarioId/reativar')
  async reativarUsuarioDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Request() req: AdminRequest,
    @Body() dto: ChangeUserStatusDto,
  ) {
    return this.convitesService.reativarUsuarioDaEmpresa(
      empresaId,
      req.user.userId,
      usuarioId,
      dto.motivo,
    );
  }
}
