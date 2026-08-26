import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { moduloProviders } from './modulo/modulo.providers';
import { aulaProviders } from './aula/aula.providers';
import { usuarioAulaProviders } from './usuario-aula/usuario-aula.providers';
import { aulaQuizProviders } from './aula-quiz/aula-quiz.providers';
import { usuarioStatsProviders } from '../usuario-stats/usuario-stats.providers';
import { ModuloService } from './modulo/modulo.service';
import { AulaService } from './aula/aula.service';
import { ModuloController } from './modulo/modulo.controller';
import { AulaController } from './aula/aula.controller';
import { AulaQuizController } from './aula-quiz/aula-quiz.controller';
import { S3Service } from './s3/s3.service';
import { UploadController } from './s3/upload.controller';

@Module({
  imports: [DatabaseModule, RedisModule, AuthModule, NotificationModule],
  controllers: [
    ModuloController,
    AulaController,
    AulaQuizController,
    UploadController,
  ],
  providers: [
    ...moduloProviders,
    ...aulaProviders,
    ...usuarioAulaProviders,
    ...aulaQuizProviders,
    ...usuarioStatsProviders,
    ModuloService,
    AulaService,
    S3Service,
  ],
  exports: [ModuloService, AulaService, S3Service],
})
export class ConteudoModule {}
