import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { NotificationModule } from '../notification/notification.module';
import { AdminAuditService } from '../admin/admin-audit.service';
import { turmaProviders } from './turma.providers';
import { JornadaTurmaService } from './jornada-turma.service';
import { TurmaAcessoService } from './turma-acesso.service';
import { TurmaService } from './turma.service';
import { TurmaAdminController } from './turma-admin.controller';
import {
  TurmaPlatformController,
  TurmaPlatformGlobalController,
} from './turma-platform.controller';
import { JornadaController } from './jornada.controller';
import { JornadaEdicaoService } from './jornada-edicao.service';
import { TurmaAvisosService } from './turma-avisos.service';
import {
  TurmaAvisosAdminController,
  TurmaAvisosPlatformController,
} from './turma-avisos.controller';

@Module({
  imports: [DatabaseModule, NotificationModule],
  controllers: [
    TurmaAdminController,
    TurmaPlatformController,
    TurmaPlatformGlobalController,
    JornadaController,
    TurmaAvisosAdminController,
    TurmaAvisosPlatformController,
  ],
  providers: [
    ...turmaProviders,
    // Serviço sem estado sobre DATA_SOURCE: instância local evita import circular com AdminModule.
    AdminAuditService,
    JornadaTurmaService,
    TurmaAcessoService,
    TurmaService,
    TurmaAvisosService,
    JornadaEdicaoService,
  ],
  exports: [...turmaProviders, JornadaTurmaService, TurmaAcessoService],
})
export class TurmaModule {}
