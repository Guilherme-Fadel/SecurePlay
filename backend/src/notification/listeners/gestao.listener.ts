import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { Role } from '../../auth/roles.enum';
import { endOfDay, getLocalDateKey } from '../../common/utils/date.utils';
import {
  adminsDaEmpresa,
  professoresDaTurma,
} from '../notification-destinatarios';
import { NOTIFICATION_EVENTS } from '../notification-events';
import type {
  AlunoEntrouTurmaPayload,
  ApelidoSolicitadoPayload,
} from '../notification-events';
import { NotificationService } from '../notification.service';

const DIA_MS = 24 * 60 * 60 * 1000;
const TEXTO_SEM_APELIDOS = 'Nenhum apelido aguardando aprovação';

/**
 * Avisos de gestão: apelidos aguardando aprovação, alunos que entraram na
 * turma. Cada handler roda em try/catch e só
 * registra falha genérica no log, para nunca derrubar a ação de origem.
 */
@Injectable()
export class GestaoNotificationListener {
  private readonly logger = new Logger(GestaoNotificationListener.name);

  constructor(
    readonly notifications: NotificationService,
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.apelidoSolicitado)
  async aoSolicitarApelido(payload: ApelidoSolicitadoPayload): Promise<void> {
    try {
      await this.atualizarApelidosPendentes(payload.empresaId);
    } catch {
      this.logger.warn('Falha ao notificar apelidos pendentes');
    }
  }

  /**
   * Resumo único por escola: "N apelidos aguardando aprovação" para cada admin
   * ativo (`resumo`: só reabre quando N aumenta; se diminui, o texto é
   * atualizado em silêncio e a leitura é preservada). Com N = 0 o resumo
   * anterior fica lido e com texto zerado, para que o próximo pedido reabra.
   */
  async atualizarApelidosPendentes(empresaId: number): Promise<void> {
    const groupKey = `apelidos-pendentes:${empresaId}`;
    const linhas = await this.dataSource.query<
      Array<{ total: number | string }>
    >(
      `SELECT COUNT(*) AS total FROM usuario
         WHERE empresa_id = ? AND role = ? AND nickname_request_status = 'pending'
           AND nickname_pending IS NOT NULL`,
      [empresaId, Role.USER],
    );
    const total = Number(linhas?.[0]?.total ?? 0);

    const admins = await adminsDaEmpresa(this.dataSource, empresaId);
    if (!admins.length) return;

    if (total <= 0) {
      await this.dataSource.query(
        `UPDATE notification SET readed = 1, message = ?
           WHERE group_key = ? AND usuario_id IN (${admins.map(() => '?').join(',')})`,
        [TEXTO_SEM_APELIDOS, groupKey, ...admins],
      );
      return;
    }

    const message =
      total === 1
        ? '1 apelido aguardando aprovação'
        : `${total} apelidos aguardando aprovação`;
    await this.notifications.notify(
      admins.map((usuarioId) => ({
        usuarioId,
        type: 'gestao' as const,
        title: 'Apelidos pendentes',
        message,
        link: '/admin/pessoas/apelidos',
        groupKey,
        mode: 'resumo' as const,
      })),
    );
  }

  @OnEvent(NOTIFICATION_EVENTS.alunoEntrouTurma)
  async aoEntrarNaTurma(payload: AlunoEntrouTurmaPayload): Promise<void> {
    try {
      await this.resumirEntradasDaTurma(payload.turmaId);
    } catch {
      this.logger.warn('Falha ao notificar entrada na turma');
    }
  }

  /** Resumo diário (dia de São Paulo) para os professores da turma, contado pelos vínculos de hoje. */
  async resumirEntradasDaTurma(
    turmaId: number,
    agora: Date = new Date(),
  ): Promise<void> {
    const turmas = await this.dataSource.query<
      Array<{ id: number; empresa_id: number; nome: string }>
    >('SELECT id, empresa_id, nome FROM turma WHERE id = ?', [turmaId]);
    const turma = turmas?.[0];
    if (!turma) return;

    const inicioDoDia = new Date(endOfDay(agora).getTime() - DIA_MS);
    const contagem = await this.dataSource.query<
      Array<{ total: number | string }>
    >(
      `SELECT COUNT(*) AS total FROM turma_aluno ta
         INNER JOIN usuario u ON u.id = ta.usuario_id
         WHERE ta.turma_id = ? AND ta.entrou_em >= ? AND u.empresa_id = ?`,
      [turmaId, inicioDoDia, turma.empresa_id],
    );
    const total = Number(contagem?.[0]?.total ?? 0);
    if (total <= 0) return;

    const professores = await professoresDaTurma(
      this.dataSource,
      turmaId,
      turma.empresa_id,
    );
    if (!professores.length) return;
    const nome = String(turma.nome).slice(0, 80);
    const message =
      total === 1
        ? `1 aluno entrou na turma ${nome} hoje`
        : `${total} alunos entraram na turma ${nome} hoje`;
    await this.notifications.notify(
      professores.map((usuarioId) => ({
        usuarioId,
        type: 'turma' as const,
        title: 'Novos alunos na turma',
        message,
        link: `/admin/turmas/${turmaId}/alunos`,
        groupKey: `turma-entradas:${turmaId}:${getLocalDateKey(agora)}`,
        mode: 'replace' as const,
      })),
    );
  }
}
