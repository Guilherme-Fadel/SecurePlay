import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { getLocalDateKey } from '../utils/date.utils';
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
import { createDailyCheckinDraft } from './daily-checkin';

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
  private readonly deliveries = new Map<string, Promise<void>>();
  private readonly deliveryStartedAt = new Map<string, number>();
  private lastDeliveryWarning = 0;

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
    await this.deliverWithinBudget(record.id);
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
    activityId: number | ((createdAt: Date) => number),
    action: (
      manager: EntityManager,
      context: { createdAt: Date; seasonId: string },
    ) => Promise<CompletionDraft<T>>,
  ): Promise<T> {
    const { record, checkin } = await withSeasonXpTransaction(
      this.source.getRepository(UsuarioStats),
      usuarioId,
      async (manager, seasonId, createdAt) => {
        const resolvedActivityId =
          typeof activityId === 'function' ? activityId(createdAt) : activityId;
        const repository = manager.getRepository(ActivityCompletion);
        const existing = await repository.findOne({
          where: {
            usuario_id: usuarioId,
            activity_type: type,
            activity_id: resolvedActivityId,
          },
        });
        if (existing) return { record: existing, checkin: null };
        const draft = await action(manager, { createdAt, seasonId });
        const previousPoints = await creditSeasonXpInTransaction(
          manager,
          usuarioId,
          draft.xp,
          seasonId,
        );
        const record = await repository.save(
          repository.create({
            usuario_id: usuarioId,
            activity_type: type,
            activity_id: resolvedActivityId,
            result: draft.result as Record<string, unknown>,
            xp: draft.xp,
            previous_points: previousPoints,
            notifications: draft.notifications ?? null,
            effects_processed: false,
            created_at: createdAt,
          }),
        );
        let checkin: ActivityCompletion | null = null;
        if (type === 'challenge') {
          // A primeira consulta da tela deve enxergar o check-in junto da missão.
          // Ambos usam o mesmo lock, dia, temporada e commit; Redis fica na outbox.
          const checkinId = Number(
            getLocalDateKey(createdAt).replaceAll('-', ''),
          );
          checkin = await repository.findOne({
            where: {
              usuario_id: usuarioId,
              activity_type: 'checkin',
              activity_id: checkinId,
            },
          });
          if (!checkin) {
            const draft = await createDailyCheckinDraft(
              manager,
              usuarioId,
              createdAt,
            );
            const previousPoints = await creditSeasonXpInTransaction(
              manager,
              usuarioId,
              draft.xp,
              seasonId,
            );
            checkin = await repository.save(
              repository.create({
                usuario_id: usuarioId,
                activity_type: 'checkin',
                activity_id: checkinId,
                result: { ...draft.result },
                xp: draft.xp,
                previous_points: previousPoints,
                notifications: null,
                effects_processed: false,
                created_at: createdAt,
              }),
            );
          }
        }
        return { record, checkin };
      },
    );
    // O SQL já confirmou o resultado; indisponibilidade posterior fica na outbox.
    await Promise.all([
      this.deliverWithinBudget(record.id),
      ...(checkin ? [this.deliverWithinBudget(checkin.id)] : []),
    ]);
    return record.result as T;
  }

  async flushPending(): Promise<void> {
    this.reportStalledDeliveries();
    if (this.draining) return;
    this.draining = true;
    try {
      const pending = await this.source.getRepository(ActivityCompletion).find({
        where: { effects_processed: false },
        order: { created_at: 'ASC', id: 'ASC' },
        take: 25,
      });
      for (const record of pending) await this.deliverWithinBudget(record.id);
    } catch {
      this.logger.warn(
        'Não foi possível consultar os efeitos pendentes de atividades',
      );
    } finally {
      this.draining = false;
    }
  }

  private deliver(id: string): Promise<void> {
    const existing = this.deliveries.get(id);
    if (existing) return existing;
    if (this.deliveries.size >= 2) return Promise.resolve();
    const delivery = this.deliverOnce(id);
    this.deliveries.set(id, delivery);
    this.deliveryStartedAt.set(id, Date.now());
    const cleanup = () => {
      this.deliveries.delete(id);
      this.deliveryStartedAt.delete(id);
    };
    void delivery.then(cleanup, cleanup);
    return delivery;
  }

  private reportStalledDeliveries(): void {
    const now = Date.now();
    const stalled = [...this.deliveryStartedAt.values()].filter(
      (started) => now - started > 30_000,
    ).length;
    if (stalled && now - this.lastDeliveryWarning >= 30_000) {
      this.lastDeliveryWarning = now;
      this.logger.error(
        `Outbox com ${stalled} entrega(s) aguardando listeners há mais de 30s; verificar dependências e reprocessar as pendências após recuperar o serviço`,
      );
    }
  }

  private async deliverWithinBudget(id: string): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.deliver(id),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 250);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async deliverOnce(id: string): Promise<void> {
    const leaseKey = `activity-delivery:${id}`;
    const owner = randomUUID();
    let claimed = false;
    try {
      claimed = await this.redis.acquireLease(leaseKey, owner, 60_000);
      if (!claimed) return;
      const repository = this.source.getRepository(ActivityCompletion);
      const record = await repository.findOneBy({ id });
      if (!record || record.effects_processed) return;
      await this.redis.applyActivityCompletion(record);
      if (record.activity_type === 'checkin') {
        await this.events.emitAsync('checkin.effects', record);
      }
      // Eventos são at-least-once. O SQL do prêmio e os incrementos Redis têm
      // dedupe própria; listeners existentes mantêm seus contratos de retry.
      await this.events.emitAsync(
        'progress.changed',
        await this.progressPayload(record),
      );
      for (const notification of record.notifications ?? []) {
        this.events.emit('notification.created', notification);
      }
      await repository.update(id, { effects_processed: true });
    } catch {
      this.logger.warn(`Efeitos pendentes da atividade ${id}`);
    } finally {
      if (claimed) {
        try {
          await this.redis.releaseLease(leaseKey, owner);
        } catch {
          /* lease expira; nunca libera lease de outra instância */
        }
      }
    }
  }

  private async progressPayload(record: ActivityCompletion): Promise<{
    usuarioId: number;
    skipCheckin?: boolean;
    checkinDay?: string;
  }> {
    const payload = { usuarioId: record.usuario_id };
    if (record.activity_type === 'checkin')
      return { ...payload, skipCheckin: true };
    if (record.activity_type !== 'challenge') return payload;
    const day = getLocalDateKey(new Date(record.created_at));
    // Pendências legadas só podem acionar o check-in no próprio dia da missão.
    if (day !== getLocalDateKey()) return { ...payload, skipCheckin: true };
    const registered = await this.source
      .getRepository(ActivityCompletion)
      .existsBy({
        usuario_id: record.usuario_id,
        activity_type: 'checkin',
        activity_id: Number(day.replaceAll('-', '')),
      });
    return registered
      ? { ...payload, skipCheckin: true }
      : { ...payload, checkinDay: day };
  }
}
