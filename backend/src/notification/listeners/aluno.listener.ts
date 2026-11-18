import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import {
  NotificationInput,
  NotificationService,
} from '../notification.service';
import { NOTIFICATION_EVENTS } from '../notification-events';
import type {
  ApelidoDecididoPayload,
  ConquistaDesbloqueadaPayload,
  ModuloPublicadoPayload,
  NivelAlcancadoPayload,
  TemporadaFechadaPayload,
} from '../notification-events';

/** Mesmo nome de `EVENTO_JORNADA_ATUALIZADA` (turma/jornada-edicao.service), sem importar o serviço. */
const EVENTO_JORNADA_ATUALIZADA = 'turma.jornada-atualizada';

interface JornadaAtualizadaPayload {
  turmaId: number;
  usuarioIds: number[];
  aulasAbertas: Array<{ id: number; titulo: string }>;
}

const LOTE_IDS = 1000;
const PAGINA_ALUNOS = 2000;

function recortar(texto: string, limite: number): string {
  const limpo = String(texto ?? '').trim();
  return limpo.length > limite ? `${limpo.slice(0, limite - 1)}…` : limpo;
}

function plural(quantidade: number, singular: string, pluralTexto: string) {
  return quantidade === 1 ? singular : pluralTexto;
}

/**
 * Notificações do aluno (conquistas, nível, temporada, aula aberta, apelido,
 * módulo novo). Cada handler roda em try/catch e só registra falhas no log, sem
 * dados pessoais, para nunca derrubar a ação de origem. Só recebem alunos
 * (`role = 'user'`) ativos; textos curtos e sem dados de outros alunos.
 */
@Injectable()
export class AlunoNotificationListener {
  private readonly logger = new Logger(AlunoNotificationListener.name);

  constructor(
    readonly notifications: NotificationService,
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.conquistaDesbloqueada)
  async aoDesbloquearConquista(
    payload: ConquistaDesbloqueadaPayload,
  ): Promise<void> {
    await this.executar('conquista', async () => {
      const [aluno] = await this.alunosAtivos([payload.usuarioId]);
      if (!aluno) return;
      await this.notifications.notify([
        {
          usuarioId: aluno,
          type: 'conquista',
          title: 'Nova conquista!',
          message: `Você desbloqueou "${recortar(payload.titulo, 120)}". Veja na sua trilha de conquistas.`,
          link: '/conquistas',
          groupKey: `conquista:${payload.conquistaId}`,
          mode: 'once',
        },
      ]);
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.nivelAlcancado)
  async aoSubirDeNivel(payload: NivelAlcancadoPayload): Promise<void> {
    await this.executar('nivel', async () => {
      const [aluno] = await this.alunosAtivos([payload.usuarioId]);
      if (!aluno) return;
      const chaves = payload.prestigio ?? 0;
      const extra =
        chaves > 0
          ? ` e ganhou ${chaves} ${plural(chaves, 'Chave Digital', 'Chaves Digitais')}`
          : '';
      await this.notifications.notify([
        {
          usuarioId: aluno,
          type: 'progresso',
          title: 'Você subiu de nível!',
          message: `Parabéns! Você chegou ao nível ${payload.nivel}${extra}.`,
          link: '/conquistas',
          groupKey: `nivel:${payload.nivel}`,
          mode: 'once',
        },
      ]);
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.temporadaFechada)
  async aoFecharTemporada(payload: TemporadaFechadaPayload): Promise<void> {
    await this.executar('temporada', async () => {
      const ativos = new Set(
        await this.alunosAtivos(payload.posicoes.map((item) => item.usuarioId)),
      );
      const rotulo = recortar(payload.rotulo, 60);
      const inputs: NotificationInput[] = payload.posicoes
        .filter((item) => ativos.has(item.usuarioId))
        .map((item) => ({
          usuarioId: item.usuarioId,
          type: 'ranking',
          title: `${rotulo} encerrada`,
          message: `Você terminou em ${item.posicao}º lugar na sua escola, com ${item.pontos} pontos. Parabéns!`,
          link: '/ranking',
          groupKey: `temporada:${payload.seasonId}`,
          mode: 'once',
        }));
      // O notify já grava em lotes de 500.
      if (inputs.length) await this.notifications.notify(inputs);
    });
  }

  @OnEvent(EVENTO_JORNADA_ATUALIZADA)
  async aoAbrirAula(payload: JornadaAtualizadaPayload): Promise<void> {
    await this.executar('aula-aberta', async () => {
      if (!payload.aulasAbertas?.length || !payload.usuarioIds?.length) return;
      const alunos = await this.alunosAtivos(payload.usuarioIds);
      // Uma notificação por aluno e por ação (cascata de aulas = um aviso só).
      const aulas = payload.aulasAbertas;
      const outras = aulas.length - 1;
      const maiorId = Math.max(...aulas.map((aula) => aula.id));
      const titulo = recortar(aulas[0].titulo, 120);
      const message =
        outras > 0
          ? `Seu professor abriu a aula "${titulo}" e +${outras} ${plural(outras, 'aula', 'aulas')}. Bora aprender?`
          : `Seu professor abriu a aula "${titulo}". Bora aprender?`;
      const inputs: NotificationInput[] = alunos.map((usuarioId) => ({
        usuarioId,
        type: 'turma',
        title: outras > 0 ? 'Aulas liberadas!' : 'Aula liberada!',
        message,
        // Sem rota pública estável por aula: leva para a trilha.
        link: '/aprender',
        groupKey: `aula-aberta:${payload.turmaId}:${maiorId}`,
        mode: 'once',
      }));
      if (inputs.length) await this.notifications.notify(inputs);
    });
  }

  @OnEvent(NOTIFICATION_EVENTS.apelidoDecidido)
  async aoDecidirApelido(payload: ApelidoDecididoPayload): Promise<void> {
    await this.executar('apelido', async () => {
      const [aluno] = await this.alunosAtivos([payload.usuarioId]);
      if (!aluno) return;
      const apelido = recortar(payload.apelido, 24);
      await this.notifications.notify([
        {
          usuarioId: aluno,
          type: 'progresso',
          title: payload.aprovado
            ? 'Apelido aprovado!'
            : 'Apelido não aprovado',
          message: payload.aprovado
            ? `Seu apelido "${apelido}" foi aprovado e já aparece para a turma.`
            : 'Esse apelido não foi aprovado. Escolha outro apelido no seu perfil.',
          link: '/perfil',
          groupKey: `apelido:${payload.usuarioId}:${apelido}`,
          mode: 'replace',
        },
      ]);
    });
  }

  /**
   * Quem vê o módulo novo: alunos ativos sem turma (catálogo ativo inteiro) e
   * alunos de turmas que já têm esse módulo na jornada. Aluno de turma sem o
   * módulo na jornada não o enxerga, então nunca é avisado.
   */
  @OnEvent(NOTIFICATION_EVENTS.moduloPublicado)
  async aoPublicarModulo(payload: ModuloPublicadoPayload): Promise<void> {
    await this.executar('modulo', async () => {
      // Módulo vazio não é anunciado: precisa estar ativo e ter aula ativa.
      const ativo = await this.dataSource.query<Array<{ id: number }>>(
        `SELECT m.id FROM modulo m
           WHERE m.id = ? AND m.active = 1
             AND EXISTS (SELECT 1 FROM aula a WHERE a.modulo_id = m.id AND a.active = 1)`,
        [payload.moduloId],
      );
      if (!ativo.length) return;
      // Cada aula nova de um módulo já anunciado dispara o evento de novo; a
      // chave `modulo:<id>` (índice por group_key) evita reler todos os alunos.
      const jaAnunciado = await this.dataSource.query<Array<{ id: number }>>(
        'SELECT id FROM notification WHERE group_key = ? LIMIT 1',
        [`modulo:${payload.moduloId}`],
      );
      if (jaAnunciado.length) return;
      const titulo = recortar(payload.titulo, 120);
      let ultimoId = 0;
      for (;;) {
        const pagina = await this.dataSource.query<Array<{ id: number }>>(
          `SELECT u.id FROM usuario u
           WHERE u.role = 'user' AND u.active = 1 AND u.id > ?
             AND (
               NOT EXISTS (SELECT 1 FROM turma_aluno ta WHERE ta.usuario_id = u.id)
               OR EXISTS (
                 SELECT 1 FROM turma_aluno ta
                 INNER JOIN turma_modulo tm ON tm.turma_id = ta.turma_id
                 WHERE ta.usuario_id = u.id AND tm.modulo_id = ?
               )
             )
           ORDER BY u.id LIMIT ?`,
          [ultimoId, payload.moduloId, PAGINA_ALUNOS],
        );
        if (!pagina.length) break;
        await this.notifications.notify(
          pagina.map((linha) => ({
            usuarioId: Number(linha.id),
            type: 'progresso' as const,
            title: 'Novo módulo no ar!',
            message: `O módulo "${titulo}" já está disponível para você.`,
            link: '/aprender',
            groupKey: `modulo:${payload.moduloId}`,
            mode: 'once' as const,
          })),
        );
        ultimoId = Number(pagina[pagina.length - 1].id);
        if (pagina.length < PAGINA_ALUNOS) break;
      }
    });
  }

  /** Mantém só alunos (role user) ativos, consultando em lotes. */
  private async alunosAtivos(ids: number[]): Promise<number[]> {
    const unicos = [...new Set(ids.filter((id) => Number.isInteger(id)))];
    const ativos: number[] = [];
    for (let i = 0; i < unicos.length; i += LOTE_IDS) {
      const lote = unicos.slice(i, i + LOTE_IDS);
      const linhas = await this.dataSource.query<Array<{ id: number }>>(
        `SELECT id FROM usuario WHERE role = 'user' AND active = 1 AND id IN (${lote.map(() => '?').join(',')})`,
        lote,
      );
      for (const linha of linhas) ativos.push(Number(linha.id));
    }
    return ativos;
  }

  private async executar(
    nome: string,
    trabalho: () => Promise<void>,
  ): Promise<void> {
    try {
      await trabalho();
    } catch {
      this.logger.warn(`Falha ao gerar notificação do aluno (${nome})`);
    }
  }
}
