import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
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

@Controller('platform/admin')
@Roles(Role.PLATFORM_ADMIN)
export class PlatformAdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly convitesService: ConvitesService,
  ) {}

  @Get('empresas')
  async listarEmpresas() {
    return this.adminService.listarEmpresas();
  }

  @Post('empresas')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async criarEmpresa(@Body() dto: CreateEmpresaDto, @Request() req: any) {
    return this.adminService.criarEmpresa(
      dto.nome,
      dto.email_administrador,
      req.user.userId,
    );
  }

  @Get('usuarios')
  async listarUsuariosGlobais() {
    return this.adminService.listarUsuariosGlobais();
  }

  @Get('empresas/:empresaId/tema')
  async getTema(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.adminService.getTemaDaEmpresa(empresaId);
  }

  @Put('empresas/:empresaId/tema')
  async updateTema(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: UpdateTemaDto,
  ) {
    return this.adminService.updateTemaDaEmpresa(empresaId, dto);
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
  ) {
    return this.convitesService.listarUsuariosDaEmpresa(empresaId);
  }

  @Get('empresas/:empresaId/convites')
  async listarConvitesDaEmpresa(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.convitesService.listarDaEmpresa(empresaId);
  }

  @Post('empresas/:empresaId/convites')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async criarConvite(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: CreateConviteDto,
    @Request() req: any,
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
  ) {
    return this.convitesService.revogarDaEmpresa(empresaId, conviteId);
  }

  @Post('empresas/:empresaId/usuarios/:usuarioId/apelido/aprovar')
  async aprovarApelido(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.convitesService.aprovarApelidoDaEmpresa(empresaId, usuarioId);
  }

  @Post('empresas/:empresaId/usuarios/:usuarioId/apelido/rejeitar')
  async rejeitarApelido(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.convitesService.rejeitarApelidoDaEmpresa(empresaId, usuarioId);
  }
}
