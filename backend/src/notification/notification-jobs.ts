import { Inject, Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { endOfDay, getLocalDateKey } from '../common/utils/date.utils';
import { Role } from '../auth/roles.enum';
import { adminsDaEmpresa } from './notification-destinatarios';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';

export interface JobAgendado {
  nome: string;
  executar(): Promise<void>;
}

const DIA_MS = 24 * 60 * 60 * 1000;
const LOTE_TRIAL = 500;

/** Jobs de gestão do agendador: fim do trial (7 e 1 dia) e convites expirados. */
@Injectable()
export class NotificationJobs {
  private readonly logger = new Logger(NotificationJobs.name);

  constructor(
    private readonly notifications: NotificationService,
    @Inject('NOTIFICATION_REPOSITORY')
    private readonly repositorio: Repository<Notification>,
  ) {}

  get jobs(): JobAgendado[] {
    return [
      {
        nome: 'trial-fim',
        executar: async () => {
          await this.avisarFimDoTrial();
        },
      },
      {
        nome: 'convites-expirados',
        executar: async () => {
          await this.avisarConvitesExpirados();
        },
      },
    ];
  }

  /**
   * Alunos ativos com `trial_ends_at` em (agora+6d, agora+7d] ou (agora, agora+1d].
   * `once` por data de término: estender o prazo gera novo aviso.
   */
  async avisarFimDoTrial(agora: Date = new Date()): Promise<number> {
    let total = 0;
    const janelas = [
      {
        dias: 7,
        de: agora.getTime() + 6 * DIA_MS,
        ate: agora.getTime() + 7 * DIA_MS,
      },
      { dias: 1, de: agora.getTime(), ate: agora.getTime() + DIA_MS },
    ];
    for (const janela of janelas) {
      let ultimoId = 0;
      for (;;) {
        const linhas = await this.repositorio.query<
          Array<{ id: number; trial_ends_at: Date }>
        >(
          `SELECT id, trial_ends_at FROM usuario
             WHERE active = 1 AND role = ? AND trial_ends_at IS NOT NULL
               AND trial_ends_at > ? AND trial_ends_at <= ? AND id > ?
             ORDER BY id LIMIT ?`,
          [
            Role.USER,
            new Date(janela.de),
            new Date(janela.ate),
            ultimoId,
            LOTE_TRIAL,
          ],
        );
        if (!linhas.length) break;
        total += await this.notifications.notify(
          linhas.map((linha) => ({
            usuarioId: Number(linha.id),
            type: 'aviso' as const,
            title:
              janela.dias === 7
                ? 'Seu teste termina em 7 dias'
                : 'Seu teste termina amanhã',
            message:
              janela.dias === 7
                ? 'Faltam 7 dias para o fim do seu teste gratuito.'
                : 'Falta 1 dia para o fim do seu teste gratuito.',
            link: '/inicio',
            groupKey: `trial-${janela.dias}d:${getLocalDateKey(new Date(linha.trial_ends_at))}`,
            mode: 'once' as const,
          })),
        );
        ultimoId = Number(linhas[linhas.length - 1].id);
        if (linhas.length < LOTE_TRIAL) break;
      }
    }
    return total;
  }

  /**
   * Convites não usados e não revogados que expiraram desde o início do dia em
   * São Paulo, por escola, com uma chave por dia. É um `resumo`: rodar várias
   * vezes no dia não reabre um aviso já lido; só reabre quando o total aumenta.
   */
  async avisarConvitesExpirados(agora: Date = new Date()): Promise<number> {
    const inicioDoDia = new Date(endOfDay(agora).getTime() - DIA_MS);
    const porEscola = await this.repositorio.query<
      Array<{ empresa_id: number; total: number | string }>
    >(
      `SELECT empresa_id, COUNT(*) AS total FROM convite
         WHERE revoked = 0 AND uses < max_uses
           AND expires_at >= ? AND expires_at <= ?
         GROUP BY empresa_id`,
      [inicioDoDia, agora],
    );

    const dia = getLocalDateKey(agora);
    let enviadas = 0;
    for (const escola of porEscola) {
      try {
        const empresaId = Number(escola.empresa_id);
        const total = Number(escola.total);
        if (!total) continue;
        const groupKey = `convites-expirados:${empresaId}:${dia}`;
        const message =
          total === 1
            ? '1 convite expirou hoje sem ser aceito'
            : `${total} convites expiraram hoje sem ser aceitos`;
        const admins = await adminsDaEmpresa(this.repositorio, empresaId);
        if (!admins.length) continue;
        enviadas += await this.notifications.notify(
          admins.map((usuarioId) => ({
            usuarioId,
            type: 'gestao' as const,
            title: 'Convites expirados',
            message,
            link: '/admin/pessoas/convites',
            groupKey,
            mode: 'resumo' as const,
          })),
        );
      } catch {
        this.logger.warn('Falha ao notificar convites expirados');
      }
    }
    return enviadas;
  }
}
