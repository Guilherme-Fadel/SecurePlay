import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

export type ModoGravacao = 'once' | 'replace' | 'resumo';

export interface NotificacaoAgrupada {
  usuarioId: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  groupKey: string | null;
  mode: ModoGravacao;
}

interface ItemComChave extends NotificacaoAgrupada {
  groupKey: string;
}

interface Existente {
  id: number;
  message: string;
}

export interface ResultadoGravacao {
  affectedRows?: number;
  insertId?: number;
}

/** Executa SQL cru no driver MySQL e devolve só o cabeçalho de resultado. */
export async function executarSql(
  repositorio: Repository<Notification>,
  sql: string,
  parametros: unknown[],
): Promise<ResultadoGravacao> {
  const resultado: unknown = await repositorio.query(sql, parametros);
  return resultado ?? {};
}

const COLUNAS =
  '(usuario_id, title, message, type, link, group_key, readed) VALUES ';
const PLACEHOLDER = '(?, ?, ?, ?, ?, ?, 0)';
const ATUALIZAR_AO_DUPLICAR =
  ' ON DUPLICATE KEY UPDATE title = VALUES(title), message = VALUES(message), link = VALUES(link), type = VALUES(type), readed = 0, created_at = NOW()';

const chaveDe = (usuarioId: number, groupKey: string) =>
  `${usuarioId}|${groupKey}`;

/** Número no início do texto ("3 apelidos...", "1 convite..."); null se não houver. */
export function contagemDoTexto(texto: string): number | null {
  const achado = /^\s*(\d+)/.exec(texto ?? '');
  return achado ? Number(achado[1]) : null;
}

async function consultar<T>(
  repositorio: Repository<Notification>,
  sql: string,
  parametros: unknown[],
): Promise<T[]> {
  const resultado: unknown = await repositorio.query(sql, parametros);
  return Array.isArray(resultado) ? (resultado as T[]) : [];
}

const tuplas = (itens: ItemComChave[]) => ({
  sql: itens.map(() => '(?, ?)').join(', '),
  parametros: itens.flatMap((item) => [item.usuarioId, item.groupKey]),
});

async function buscarExistentes(
  repositorio: Repository<Notification>,
  itens: ItemComChave[],
): Promise<Map<string, Existente>> {
  const existentes = new Map<string, Existente>();
  if (!itens.length) return existentes;
  const { sql, parametros } = tuplas(itens);
  const linhas = await consultar<{
    id: number;
    usuario_id: number;
    group_key: string;
    message: string;
  }>(
    repositorio,
    `SELECT id, usuario_id, group_key, message FROM notification WHERE (usuario_id, group_key) IN (${sql})`,
    parametros,
  );
  for (const linha of linhas) {
    existentes.set(chaveDe(Number(linha.usuario_id), linha.group_key), {
      id: Number(linha.id),
      message: String(linha.message ?? ''),
    });
  }
  return existentes;
}

async function inserirEmLote(
  repositorio: Repository<Notification>,
  itens: ItemComChave[],
  sqlInicio: string,
  sqlFim: string,
): Promise<void> {
  if (!itens.length) return;
  await repositorio.query(
    `${sqlInicio}${itens.map(() => PLACEHOLDER).join(', ')}${sqlFim}`,
    itens.flatMap((item) => [
      item.usuarioId,
      item.title,
      item.message,
      item.type,
      item.link,
      item.groupKey,
    ]),
  );
}

/** Um item por (usuário, chave): `once` mantém o primeiro, os demais modos o último. */
function deduplicar(itens: NotificacaoAgrupada[]): ItemComChave[] {
  const unicos = new Map<string, ItemComChave>();
  for (const item of itens) {
    if (!item.groupKey) continue;
    const chave = chaveDe(item.usuarioId, item.groupKey);
    const atual = unicos.get(chave);
    if (atual?.mode === 'once' && item.mode === 'once') continue;
    unicos.set(chave, item as ItemComChave);
  }
  return [...unicos.values()];
}

/**
 * Grava um lote (até 500) de notificações com chave de agrupamento em poucas
 * consultas multi-linha e devolve os IDs que devem ser publicados no socket.
 *
 * - `once`: insere só quem ainda não tem a chave (`INSERT IGNORE`).
 * - `replace`: insere ou atualiza texto, zera a leitura e renova a data.
 * - `resumo`: texto começa com uma contagem. Só reabre (não lida, data nova)
 *   quando a contagem AUMENTA em relação ao texto gravado; se diminui, só
 *   atualiza título e texto em silêncio (lida continua lida, sem socket).
 *
 * Quem será publicado é decidido por uma consulta das chaves ANTES da escrita
 * (e não por `created_at`, que tem precisão de segundos): `once` e `resumo`
 * já existentes não são reemitidos; `replace` sempre é. Se outro processo
 * inserir a mesma chave entre a consulta e a escrita, o pior caso é uma
 * publicação duplicada no socket; o banco continua com uma linha só.
 */
export async function gravarAgrupadas(
  repositorio: Repository<Notification>,
  entrada: NotificacaoAgrupada[],
): Promise<number[]> {
  const itens = deduplicar(entrada);
  if (!itens.length) return [];

  const existentes = await buscarExistentes(
    repositorio,
    itens.filter((item) => item.mode !== 'replace'),
  );
  const novas: ItemComChave[] = [];
  const reescritas: ItemComChave[] = [];
  const silenciosas: Array<{ id: number; item: ItemComChave }> = [];

  for (const item of itens) {
    if (item.mode === 'replace') {
      reescritas.push(item);
      continue;
    }
    const atual = existentes.get(chaveDe(item.usuarioId, item.groupKey));
    if (!atual) {
      novas.push(item);
      continue;
    }
    if (item.mode === 'once') continue;

    const nova = contagemDoTexto(item.message);
    if (nova === null) {
      reescritas.push(item);
      continue;
    }
    const antiga = contagemDoTexto(atual.message) ?? 0;
    if (nova > antiga) reescritas.push(item);
    else if (atual.message !== item.message)
      silenciosas.push({ id: atual.id, item });
  }

  await inserirEmLote(
    repositorio,
    novas,
    `INSERT IGNORE INTO notification ${COLUNAS}`,
    '',
  );
  await inserirEmLote(
    repositorio,
    reescritas,
    `INSERT INTO notification ${COLUNAS}`,
    ATUALIZAR_AO_DUPLICAR,
  );
  for (const { id, item } of silenciosas) {
    await repositorio.query(
      'UPDATE notification SET title = ?, message = ?, link = ? WHERE id = ?',
      [item.title, item.message, item.link, id],
    );
  }

  const publicar = [...novas, ...reescritas];
  if (!publicar.length) return [];
  const { sql, parametros } = tuplas(publicar);
  const linhas = await consultar<{ id: number }>(
    repositorio,
    `SELECT id FROM notification WHERE (usuario_id, group_key) IN (${sql})`,
    parametros,
  );
  return linhas.map((linha) => Number(linha.id));
}
