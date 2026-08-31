import { Controller, Get, Put, Post, Body, Request, Param } from '@nestjs/common';
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
  async listarUsuarios(@Request() req: any) {
    return this.convitesService.listarUsuarios(req.user.userId);
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
}
