import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ConvitesService } from './convites.service';
import { CreateConviteDto } from './dto/create-convite.dto';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { PresignLogoDto } from './dto/presign-logo.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { Throttle } from '@nestjs/throttler';

@Controller('admin/empresa')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly convitesService: ConvitesService,
  ) {}

  @Get('tema')
  async getTema(@Request() req: any) {
    return this.adminService.getTema(req.user.userId);
  }

  @Get('parametros')
  async getParametros(@Request() req: any) {
    return this.adminService.getParametros(req.user.userId);
  }

  @Put('tema')
  async updateTema(@Request() req: any, @Body() dto: UpdateTemaDto) {
    return this.adminService.updateTema(req.user.userId, dto);
  }

  @Post('logo/presign')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async presignLogo(@Request() req: any, @Body() dto: PresignLogoDto) {
    return this.adminService.presignLogo(req.user.userId, dto.contentType);
  }

  @Get('usuarios')
  async listarUsuarios(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'management',
  ) {
    return this.convitesService.listarUsuariosPaginados(req.user.userId, {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
      status,
    });
  }

  @Get('resumo')
  async obterResumo(@Request() req: any) {
    return this.convitesService.obterResumoAdministrativo(req.user.userId);
  }

  @Get('apelidos-pendentes')
  async listarApelidosPendentes(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.convitesService.listarApelidosPendentes(req.user.userId, {
      page: Number(page),
      pageSize: Number(pageSize),
      search,
    });
  }

  @Get('convites')
  async listarConvites(@Request() req: any) {
    return this.convitesService.listar(req.user.userId);
  }

  @Post('convites')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async criarConvite(@Request() req: any, @Body() dto: CreateConviteDto) {
    return this.convitesService.criar(req.user.userId, dto);
  }

  @Post('convites/:id/revogar')
  async revogarConvite(@Request() req: any, @Param('id') id: string) {
    return this.convitesService.revogar(req.user.userId, Number(id));
  }

  @Post('usuarios/:id/apelido/aprovar')
  async aprovarApelido(@Request() req: any, @Param('id') id: string) {
    return this.convitesService.aprovarApelido(req.user.userId, Number(id));
  }

  @Post('usuarios/:id/apelido/rejeitar')
  async rejeitarApelido(@Request() req: any, @Param('id') id: string) {
    return this.convitesService.rejeitarApelido(req.user.userId, Number(id));
  }

  @Post('usuarios/:id/inativar')
  async inativarUsuario(@Request() req: any, @Param('id') id: string) {
    return this.convitesService.inativarUsuario(req.user.userId, Number(id));
  }
}
