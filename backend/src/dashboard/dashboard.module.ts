import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { usuarioStatsProviders } from '../usuario-stats/usuario-stats.providers';
import { ChallengeModule } from '../challenge/challenge.module';
import { RedisModule } from '../redis/redis.module';
import { ArcadeModule } from '../arcade/arcade.module';
import { S3Service } from '../conteudo/s3/s3.service';

@Module({
  imports: [DatabaseModule, RedisModule, ChallengeModule, ArcadeModule],
  controllers: [DashboardController],
  providers: [...usuarioStatsProviders, DashboardService, S3Service],
  exports: [DashboardService],
})
export class DashboardModule {}
