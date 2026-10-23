import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Request,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ConvitesService } from './convites.service';
import { CreateConviteDto } from './dto/create-convite.dto';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { PresignLogoDto } from './dto/presign-logo.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { Throttle } from '@nestjs/throttler';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

type AdminRequest = { user: { userId: number } };

@Controller('admin/empresa')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly convitesService: ConvitesService,
  ) {}

  @Get('tema')
  async getTema(@Request() req: AdminRequest) {
    return this.adminService.getTema(req.user.userId);
  }

  @Get('parametros')
  async getParametros(@Request() req: AdminRequest) {
    return this.adminService.getParametros(req.user.userId);
  }

  @Put('tema')
  async updateTema(@Request() req: AdminRequest, @Body() dto: UpdateTemaDto) {
    return this.adminService.updateTema(req.user.userId, dto);
  }

  @Post('logo/presign')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async presignLogo(@Request() req: AdminRequest, @Body() dto: PresignLogoDto) {
    return this.adminService.presignLogo(req.user.userId, dto.contentType);
  }

  @Get('usuarios')
  async listarUsuarios(
    @Request() req: AdminRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'management',
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.convitesService.listarUsuariosPaginados(req.user.userId, {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      status,
      sort,
    });
  }

  @Get('usuarios/:id')
  async obterUsuario(
    @Request() req: AdminRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.convitesService.obterUsuario(req.user.userId, id);
  }

  @Put('usuarios/:id')
  async atualizarUsuario(
    @Request() req: AdminRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.convitesService.atualizarUsuario(req.user.userId, id, dto);
  }

  @Get('resumo')
  async obterResumo(@Request() req: AdminRequest) {
    return this.convitesService.obterResumoAdministrativo(req.user.userId);
  }

  @Get('apelidos-pendentes')
  async listarApelidosPendentes(
    @Request() req: AdminRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'default' | 'asc' | 'desc',
  ) {
    return this.convitesService.listarApelidosPendentes(req.user.userId, {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      sort,
    });
  }

  @Get('convites')
  async listarConvites(@Request() req: AdminRequest) {
    return this.convitesService.listar(req.user.userId);
  }

  @Get('convites/paginados')
  async listarConvitesPaginados(
    @Request() req: AdminRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.convitesService.listarPaginados(req.user.userId, {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      sort,
    });
  }

  @Post('convites')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async criarConvite(
    @Request() req: AdminRequest,
    @Body() dto: CreateConviteDto,
  ) {
    return this.convitesService.criar(req.user.userId, dto);
  }

  @Post('convites/:id/revogar')
  async revogarConvite(@Request() req: AdminRequest, @Param('id') id: string) {
    return this.convitesService.revogar(req.user.userId, Number(id));
  }

  @Post('usuarios/:id/apelido/aprovar')
  async aprovarApelido(@Request() req: AdminRequest, @Param('id') id: string) {
    return this.convitesService.aprovarApelido(req.user.userId, Number(id));
  }

  @Post('usuarios/:id/apelido/rejeitar')
  async rejeitarApelido(@Request() req: AdminRequest, @Param('id') id: string) {
    return this.convitesService.rejeitarApelido(req.user.userId, Number(id));
  }

  @Post('usuarios/:id/inativar')
  async inativarUsuario(
    @Request() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ChangeUserStatusDto,
  ) {
    return this.convitesService.inativarUsuario(
      req.user.userId,
      Number(id),
      dto.motivo,
    );
  }

  @Post('usuarios/:id/reativar')
  async reativarUsuario(
    @Request() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ChangeUserStatusDto,
  ) {
    return this.convitesService.reativarUsuario(
      req.user.userId,
      Number(id),
      dto.motivo,
    );
  }

  @Post('usuarios/:id/redefinicao-acesso')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async emitirLinkRedefinicaoAluno(
    @Request() req: AdminRequest,
    @Param('id') id: string,
  ) {
    return this.convitesService.emitirLinkRedefinicaoAluno(
      req.user.userId,
      Number(id),
    );
  }
}
