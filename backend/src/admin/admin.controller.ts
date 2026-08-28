import { Controller, Get, Put, Post, Body, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { PresignLogoDto } from './dto/presign-logo.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { Throttle } from '@nestjs/throttler';

@Controller('admin/empresa')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
