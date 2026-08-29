import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.molule';
import { RedisModule } from '../../redis/redis.module';
import { usuarioStatsProviders } from '../../usuario-stats/usuario-stats.providers';
import { XpService } from './xp.service';
@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [...usuarioStatsProviders, XpService],
  exports: [XpService],
})
export class GamificationModule {}
