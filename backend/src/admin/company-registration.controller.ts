import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Body,
  Header,
  Post,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CompanyRegistrationService } from './company-registration.service';
import { LookupCompanyCnpjDto } from './dto/company-registration.dto';
type SessionRequest = { user: { userId: number } };

@Controller('platform/admin/empresas')
@Roles(Role.PLATFORM_ADMIN)
export class PlatformCompanyRegistrationController {
  constructor(private readonly service: CompanyRegistrationService) {}
  @Post('cadastro/cnpj')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ short: { limit: 15, ttl: 60000 } })
  findCnpj(@Request() req: SessionRequest, @Body() dto: LookupCompanyCnpjDto) {
    return this.service.findCnpj(req.user.userId, dto.cnpj);
  }
  @Get(':empresaId/cadastro')
  @Header('Cache-Control', 'private, no-store')
  detail(
    @Request() req: SessionRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ) {
    return this.service.platform(req.user.userId, empresaId);
  }
}

@Controller('admin/empresa')
@Roles(Role.ADMIN)
export class OwnCompanyRegistrationController {
  constructor(private readonly service: CompanyRegistrationService) {}
  @Get('cadastro')
  @Header('Cache-Control', 'private, no-store')
  detail(@Request() req: SessionRequest) {
    return this.service.own(req.user.userId);
  }
}
