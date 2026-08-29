import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { RedisService } from '../../redis/redis.service';
import { ttlUntilEndOfDay } from '../utils/date.utils';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    let stats = await this.statsRepository.findOne({ where: { usuario_id } });
    if (!stats) {
      stats = this.statsRepository.create({ usuario_id });
    }
    stats.total_points += amount;
    await this.statsRepository.save(stats);
    const key = `xp-today:${usuario_id}`;
    await this.redisService.incrBy(key, amount, ttlUntilEndOfDay());
    await this.eventEmitter.emitAsync('progress.changed', { usuarioId: usuario_id });
  }
}
