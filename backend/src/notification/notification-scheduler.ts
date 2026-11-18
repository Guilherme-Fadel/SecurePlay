import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { Notification } from './notification.entity';
import { executarSql } from './notification-sql';
import { NotificationJobs } from './notification-jobs';

export interface NotificationJob {
  nome: string;
  executar(): Promise<void>;
}

const INTERVALO_MS = 60 * 60 * 1000;
const PRIMEIRA_EXECUCAO_MS = 60 * 1000;
const CHAVE_TRAVA = 'lock:notification-scheduler';
// Menor que o intervalo: a trava expira antes da próxima rodada.
const TTL_TRAVA_MS = 3300 * 1000;
const LOTE_RETENCAO = 1000;
const DIAS_LIDAS = 90;
const DIAS_NAO_LIDAS = 180;

/** Agendador horário das notificações; uma única instância executa por rodada (trava no Redis). */
@Injectable()
export class NotificationScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationScheduler.name);
  private timer?: NodeJS.Timeout;
  private primeira?: NodeJS.Timeout;
  readonly jobs: NotificationJob[];

  constructor(
    @Inject('NOTIFICATION_REPOSITORY')
    private readonly notificationRepository: Repository<Notification>,
    private readonly redis: RedisService,
    gestaoJobs: NotificationJobs,
  ) {
    this.jobs = [
      {
        nome: 'retencao',
        executar: async () => {
          await this.aplicarRetencao();
        },
      },
      ...gestaoJobs.jobs,
    ];
  }

  habilitado(): boolean {
    return (
      process.env.NODE_ENV !== 'test' &&
      process.env.NOTIFICATION_SCHEDULER_ENABLED !== 'false'
    );
  }

  onApplicationBootstrap(): void {
    if (!this.habilitado()) return;
    this.primeira = setTimeout(() => void this.rodar(), PRIMEIRA_EXECUCAO_MS);
    this.primeira.unref();
    this.timer = setInterval(() => void this.rodar(), INTERVALO_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.primeira) clearTimeout(this.primeira);
    if (this.timer) clearInterval(this.timer);
  }

  /** Executa os jobs se esta instância conseguir a trava; cada job é isolado. */
  async rodar(): Promise<boolean> {
    const dono = randomUUID();
    let travou = false;
    try {
      travou = await this.redis.acquireLease(CHAVE_TRAVA, dono, TTL_TRAVA_MS);
    } catch {
      this.logger.warn('Agendador de notificações: trava indisponível');
      return false;
    }
    if (!travou) return false;

    for (const job of this.jobs) {
      try {
        await job.executar();
      } catch {
        this.logger.warn(`Job de notificações falhou: ${job.nome}`);
      }
    }
    // A trava segue até expirar (TTL) para não repetir a rodada em outra instância.
    return true;
  }

  /** Apaga lidas com mais de 90 dias e não lidas com mais de 180, em lotes. */
  async aplicarRetencao(agora: Date = new Date()): Promise<number> {
    const limite = (dias: number) =>
      new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
    let removidas = 0;
    for (const [lida, dias] of [
      [1, DIAS_LIDAS],
      [0, DIAS_NAO_LIDAS],
    ] as const) {
      let afetadas = 0;
      do {
        const resultado = await executarSql(
          this.notificationRepository,
          'DELETE FROM notification WHERE readed = ? AND created_at < ? LIMIT ?',
          [lida, limite(dias), LOTE_RETENCAO],
        );
        afetadas = resultado.affectedRows ?? 0;
        removidas += afetadas;
      } while (afetadas >= LOTE_RETENCAO);
    }
    return removidas;
  }
}
