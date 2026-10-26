import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { Usuario } from '../../usuario/usuario.entity';
import { RedisService } from '../../redis/redis.service';
import {
  ActivityCompletion,
  ActivityType,
  CompletionNotification,
} from './activity-completion.entity';
import {
  creditSeasonXpInTransaction,
  withSeasonXpTransaction,
} from './credit-season-xp';

export interface CompletionDraft<T> {
  result: T;
  xp: number;
  notifications?: CompletionNotification[];
}

@Injectable()
export class ActivityCompletionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ActivityCompletionService.name);
  private timer?: ReturnType<typeof setInterval>;
  private draining = false;

  constructor(
    @Inject('DATA_SOURCE') private readonly source: DataSource,
    private readonly redis: RedisService,
    private readonly events: EventEmitter2,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flushPending(), 30_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async replay<T>(
    usuarioId: number,
    type: ActivityType,
    activityId: number,
  ): Promise<T | null> {
    const record = await this.source.getRepository(ActivityCompletion).findOne({
      where: {
        usuario_id: usuarioId,
        activity_type: type,
        activity_id: activityId,
      },
    });
    if (!record) return null;
    await this.deliver(record.id);
    return record.result as T;
  }

  /** PATCH e conclusão compartilham o mesmo lock; nenhum snapshot antigo reabre a atividade. */
  async updateProgress<T>(
    usuarioId: number,
    action: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.source.transaction(async (manager) => {
      await manager
        .getRepository(Usuario)
        .createQueryBuilder('u')
        .setLock('pessimistic_write')
        .where('u.id = :id', { id: usuarioId })
        .getOneOrFail();
      return action(manager);
    });
  }

  async complete<T extends object>(
    usuarioId: number,
    type: ActivityType,
    activityId: number,
    action: (manager: EntityManager) => Promise<CompletionDraft<T>>,
  ): Promise<T> {
    const record = await withSeasonXpTransaction(
      this.source.getRepository(UsuarioStats),
      usuarioId,
      async (manager, seasonId, createdAt) => {
        const repository = manager.getRepository(ActivityCompletion);
        const existing = await repository.findOne({
          where: {
            usuario_id: usuarioId,
            activity_type: type,
            activity_id: activityId,
          },
        });
        if (existing) return existing;
        const draft = await action(manager);
        const previousPoints = await creditSeasonXpInTransaction(
          manager,
          usuarioId,
          draft.xp,
          seasonId,
        );
        return repository.save(
          repository.create({
            usuario_id: usuarioId,
            activity_type: type,
            activity_id: activityId,
            result: draft.result as Record<string, unknown>,
            xp: draft.xp,
            previous_points: previousPoints,
            notifications: draft.notifications ?? null,
            effects_processed: false,
            created_at: createdAt,
          }),
        );
      },
    );
    // O SQL já confirmou o resultado; indisponibilidade posterior fica na outbox.
    await this.deliver(record.id);
    return record.result as T;
  }

  async flushPending(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      const pending = await this.source.getRepository(ActivityCompletion).find({
        where: { effects_processed: false },
        order: { created_at: 'ASC', id: 'ASC' },
        take: 25,
      });
      for (const record of pending) await this.deliver(record.id);
    } catch {
      this.logger.warn(
        'Não foi possível consultar os efeitos pendentes de atividades',
      );
    } finally {
      this.draining = false;
    }
  }

  private async deliver(id: string): Promise<void> {
    try {
      await this.source.transaction(async (manager) => {
        const repository = manager.getRepository(ActivityCompletion);
        const record = await repository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!record || record.effects_processed) return;
        await this.redis.applyActivityCompletion(record);
        // Eventos são at-least-once. O SQL do prêmio e os incrementos Redis têm
        // dedupe própria; listeners existentes mantêm seus contratos de retry.
        await this.events.emitAsync('progress.changed', {
          usuarioId: record.usuario_id,
        });
        for (const notification of record.notifications ?? []) {
          this.events.emit('notification.created', notification);
        }
        await repository.update(id, { effects_processed: true });
      });
    } catch {
      this.logger.warn(`Efeitos pendentes da atividade ${id}`);
    }
  }
}
