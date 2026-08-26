import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { RedisService } from '../../redis/redis.service';
import { ttlUntilEndOfDay } from '../utils/date.utils';

/**
 * Servico compartilhado de concessao de XP.
 *
 * Centraliza a regra hoje duplicada em challenge/aula/dashboard (ver backend.md 9.2):
 * somar em UsuarioStats.total_points (fonte durável) e acumular no xp-today do Redis
 * (janela diaria usada pelo dashboard). Toda concessao de XP nova deve passar por aqui.
 */
@Injectable()
export class XpService {
  constructor(
    @Inject('USUARIO_STATS_REPOSITORY')
    private statsRepository: Repository<UsuarioStats>,

    private redisService: RedisService,
  ) {}

  /**
   * Credita `amount` de XP ao usuario. Valores <= 0 sao ignorados (nao credita, nao falha).
   * Atualiza total_points e o acumulado do dia (xp-today) com TTL ate o fim do dia.
   */
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
  }
}
