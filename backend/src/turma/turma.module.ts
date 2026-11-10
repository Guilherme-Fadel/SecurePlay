import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { AdminAuditService } from '../admin/admin-audit.service';
import { turmaProviders } from './turma.providers';
import { JornadaTurmaService } from './jornada-turma.service';
import { TurmaAcessoService } from './turma-acesso.service';
import { TurmaService } from './turma.service';
import { TurmaAdminController } from './turma-admin.controller';
import { TurmaPlatformController } from './turma-platform.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [TurmaAdminController, TurmaPlatformController],
  providers: [
    ...turmaProviders,
    // Serviço sem estado sobre DATA_SOURCE: instância local evita import circular com AdminModule.
    AdminAuditService,
    JornadaTurmaService,
    TurmaAcessoService,
    TurmaService,
  ],
  exports: [...turmaProviders, JornadaTurmaService, TurmaAcessoService],
})
export class TurmaModule {}
