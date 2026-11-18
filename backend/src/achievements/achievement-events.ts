import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notification/notification-events';

const logger = new Logger('AchievementEvents');

/** O que a sincronização da trilha gravou de novo (só novidades, nunca o estado inteiro). */
export interface NovidadesDaTrilha {
  conquistas: Array<{ id: number; titulo: string }>;
  /** Níveis cujo Prestígio foi concedido agora (o nível inicial não conta). */
  niveis: number[];
}

export function novidadesVazias(): NovidadesDaTrilha {
  return { conquistas: [], niveis: [] };
}

/**
 * Publica os eventos de notificação depois do commit. Best-effort: falha aqui
 * nunca quebra a leitura da trilha nem desfaz o que já foi gravado.
 */
export function emitirNovidades(
  events: EventEmitter2 | undefined,
  usuarioId: number,
  novidades: NovidadesDaTrilha,
): void {
  if (!events) return;
  try {
    for (const conquista of novidades.conquistas) {
      events.emit(NOTIFICATION_EVENTS.conquistaDesbloqueada, {
        usuarioId,
        conquistaId: conquista.id,
        titulo: conquista.titulo,
      });
    }
    if (novidades.niveis.length) {
      events.emit(NOTIFICATION_EVENTS.nivelAlcancado, {
        usuarioId,
        nivel: Math.max(...novidades.niveis),
        prestigio: novidades.niveis.length,
      });
    }
  } catch {
    logger.warn('Falha ao publicar eventos de notificação da trilha');
  }
}
