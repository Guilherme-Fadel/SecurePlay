import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { usuarioStatsProviders } from '../usuario-stats/usuario-stats.providers';
import { ChallengeModule } from '../challenge/challenge.module';
import { RedisModule } from '../redis/redis.module';
import { ArcadeModule } from '../arcade/arcade.module';
import { ConteudoModule } from '../conteudo/conteudo.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    ChallengeModule,
    ArcadeModule,
    ConteudoModule,
  ],
  controllers: [DashboardController],
  providers: [...usuarioStatsProviders, DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
