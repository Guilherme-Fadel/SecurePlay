import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.molule';
import { RedisModule } from '../../redis/redis.module';
import { usuarioStatsProviders } from '../../usuario-stats/usuario-stats.providers';
import { XpService } from './xp.service';

/**
 * Modulo de gamificacao compartilhada. Prove o XpService (concessao de XP centralizada)
 * e o repositorio de stats de que ele depende. Quem precisar creditar XP importa este
 * modulo e injeta XpService, em vez de duplicar a logica de total_points + xp-today.
 */
@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [...usuarioStatsProviders, XpService],
  exports: [XpService],
})
export class GamificationModule {}
