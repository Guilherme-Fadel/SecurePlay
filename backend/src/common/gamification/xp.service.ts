import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { RedisService } from '../../redis/redis.service';
import { ttlUntilEndOfDay } from '../utils/date.utils';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { creditSeasonXp } from './credit-season-xp';
@Injectable()
export class XpService {
  constructor(
    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,
    private redisService: RedisService,
    private eventEmitter: EventEmitter2,
  ) {}
  async creditXp(usuario_id: number, amount: number): Promise<void> {
    if (amount <= 0) return;
    const previousPoints = await creditSeasonXp(this.statsRepository, usuario_id, amount);
    await this.redisService.recordRankingXp(usuario_id, previousPoints, amount);
    const key = `xp-today:${usuario_id}`;
    await this.redisService.incrBy(key, amount, ttlUntilEndOfDay());
    await this.eventEmitter.emitAsync('progress.changed', {
      usuarioId: usuario_id,
    });
  }
}
