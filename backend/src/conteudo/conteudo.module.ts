import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { moduloProviders } from './modulo/modulo.providers';
import { aulaProviders } from './aula/aula.providers';
import { usuarioAulaProviders } from './usuario-aula/usuario-aula.providers';
import { aulaQuizProviders } from './aula-quiz/aula-quiz.providers';
import { usuarioStatsProviders } from '../usuario-stats/usuario-stats.providers';

@Module({
  imports: [DatabaseModule, RedisModule, AuthModule],
  controllers: [],
  providers: [
    ...moduloProviders,
    ...aulaProviders,
    ...usuarioAulaProviders,
    ...aulaQuizProviders,
    ...usuarioStatsProviders,
  ],
  exports: [],
})
export class ConteudoModule {}
