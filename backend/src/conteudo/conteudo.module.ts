import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { moduloProviders } from './modulo/modulo.providers';
import { aulaProviders } from './aula/aula.providers';
import { usuarioAulaProviders } from './usuario-aula/usuario-aula.providers';
import { aulaQuizProviders } from './aula-quiz/aula-quiz.providers';
import { usuarioStatsProviders } from '../usuario-stats/usuario-stats.providers';
import { ModuloService } from './modulo/modulo.service';
import { AulaService } from './aula/aula.service';
import { ModuloController } from './modulo/modulo.controller';
import { AulaController } from './aula/aula.controller';

@Module({
  imports: [DatabaseModule, RedisModule, AuthModule],
  controllers: [ModuloController, AulaController],
  providers: [
    ...moduloProviders,
    ...aulaProviders,
    ...usuarioAulaProviders,
    ...aulaQuizProviders,
    ...usuarioStatsProviders,
    ModuloService,
    AulaService,
  ],
  exports: [ModuloService, AulaService],
})
export class ConteudoModule {}
