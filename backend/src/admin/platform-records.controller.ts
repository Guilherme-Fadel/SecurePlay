import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { PlatformRecordsService } from './platform-records.service';

@Controller('platform/admin/registros')
@Roles(Role.PLATFORM_ADMIN)
export class PlatformRecordsController {
  constructor(private readonly records: PlatformRecordsService) {}

  @Get(':resource')
  list(
    @Param('resource') resource: string,
    @Query()
    query: {
      page?: string;
      pageSize?: string;
      empresaId?: string;
      search?: string;
      status?: string;
      sort?: string;
    },
  ) {
    return this.records.list(resource, query);
  }
}
