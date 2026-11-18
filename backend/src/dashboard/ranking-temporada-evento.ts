import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TemporadaFechadaPayload } from '../notification/notification-events';

const logger = new Logger('RankingTemporadaEvento');

type Emissor = (payload: TemporadaFechadaPayload) => void;

const emissorPorDataSource = new WeakMap<DataSource, Emissor>();

/**
 * As funções de fechamento são soltas (só recebem o DataSource); quem tem o
 * EventEmitter2 registra aqui o emissor do fechamento de temporada.
 */
export function registrarEmissorTemporada(
  dataSource: DataSource,
  emissor: Emissor,
): void {
  emissorPorDataSource.set(dataSource, emissor);
}

interface LinhaSnapshot {
  usuario_id: number | string;
  points: number | string;
  empresa_id: number | string;
}

/**
 * Posição final de cada aluno que pontuou, dentro da própria empresa (empate
 * divide a posição). Só alunos do snapshot (role `user`), só empresas com ranking
 * ligado; quem não pontuou na temporada fica de fora.
 */
export function calcularPosicoes(
  linhas: LinhaSnapshot[],
): TemporadaFechadaPayload['posicoes'] {
  const posicoes: TemporadaFechadaPayload['posicoes'] = [];
  const porEmpresa = new Map<number, LinhaSnapshot[]>();
  for (const linha of linhas) {
    const empresa = Number(linha.empresa_id);
    const grupo = porEmpresa.get(empresa) ?? [];
    grupo.push(linha);
    porEmpresa.set(empresa, grupo);
  }
  for (const grupo of porEmpresa.values()) {
    grupo.sort((a, b) => Number(b.points) - Number(a.points));
    let posicao = 0;
    let anterior: number | null = null;
    grupo.forEach((linha, indice) => {
      const pontos = Number(linha.points);
      if (pontos !== anterior) posicao = indice + 1;
      anterior = pontos;
      posicoes.push({
        usuarioId: Number(linha.usuario_id),
        posicao,
        pontos,
      });
    });
  }
  return posicoes;
}

/** Depois do commit do fechamento: lê o snapshot congelado e publica o evento. Best-effort. */
export async function anunciarTemporadaFechada(
  dataSource: DataSource,
  seasonId: string,
  rotulo: string,
): Promise<void> {
  const emissor = emissorPorDataSource.get(dataSource);
  if (!emissor) return;
  try {
    const linhas = await dataSource.query<LinhaSnapshot[]>(
      `SELECT sn.usuario_id, sn.points, sn.empresa_id
       FROM ranking_season_snapshot sn
       INNER JOIN empresa e ON e.id = sn.empresa_id
       WHERE sn.season_id = ? AND sn.points > 0
         AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(e.parametros_funcionalidades, '$.rankingEnabled')), 'true') = 'true'`,
      [seasonId],
    );
    const posicoes = calcularPosicoes(linhas);
    if (posicoes.length) emissor({ seasonId, rotulo, posicoes });
  } catch {
    logger.warn('Falha ao publicar o evento de temporada fechada');
  }
}
