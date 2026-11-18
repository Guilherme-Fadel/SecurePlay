import { closeRankingSeason } from './ranking-history';
import {
  calcularPosicoes,
  registrarEmissorTemporada,
} from './ranking-temporada-evento';

const INICIO = [{ start_local_at: '2026-09-01 00:00:00.000000' }];

function montar(opcoes: { jaFechada?: boolean; snapshot?: unknown[] }) {
  const ordem: string[] = [];
  const manager = {
    query: jest.fn((sql: string) => {
      if (sql.includes('FROM ranking_season_close'))
        return Promise.resolve(
          opcoes.jaFechada ? [{ season_id: '2026-09' }] : [],
        );
      if (sql.includes('INSERT INTO ranking_season_close'))
        ordem.push('marcador');
      return Promise.resolve([]);
    }),
  };
  const dataSource = {
    query: jest.fn((sql: string) => {
      if (sql.includes('FROM ranking_season_snapshot')) {
        ordem.push('leitura-snapshot');
        return Promise.resolve(opcoes.snapshot ?? []);
      }
      return Promise.resolve(INICIO);
    }),
    transaction: jest.fn(async (callback: (m: unknown) => Promise<unknown>) => {
      const resultado = await callback(manager);
      ordem.push('commit');
      return resultado;
    }),
  };
  const emissor = jest.fn(() => {
    ordem.push('emit');
  });
  registrarEmissorTemporada(dataSource as never, emissor);
  return { dataSource, emissor, ordem };
}

describe('evento de temporada fechada', () => {
  it('emite depois do commit, com a posição de cada aluno na própria escola', async () => {
    const { dataSource, emissor, ordem } = montar({
      snapshot: [
        { usuario_id: 1, points: 50, empresa_id: 10 },
        { usuario_id: 2, points: 80, empresa_id: 10 },
        { usuario_id: 3, points: 50, empresa_id: 10 },
        { usuario_id: 4, points: 10, empresa_id: 20 },
      ],
    });

    await closeRankingSeason(dataSource as never, '2026-09');

    expect(ordem).toEqual(['marcador', 'commit', 'leitura-snapshot', 'emit']);
    const payload = (emissor.mock.calls[0] as unknown[])[0];
    expect(payload).toMatchObject({
      seasonId: '2026-09',
      rotulo: 'Temporada 1',
    });
    const posicoes = (payload as { posicoes: unknown[] }).posicoes;
    expect(posicoes).toEqual(
      expect.arrayContaining([
        { usuarioId: 2, posicao: 1, pontos: 80 },
        { usuarioId: 1, posicao: 2, pontos: 50 },
        { usuarioId: 3, posicao: 2, pontos: 50 },
        { usuarioId: 4, posicao: 1, pontos: 10 },
      ]),
    );
  });

  it('não reemite quando a temporada já estava fechada (reexecução ou corrida)', async () => {
    const { dataSource, emissor } = montar({
      jaFechada: true,
      snapshot: [{ usuario_id: 1, points: 5, empresa_id: 10 }],
    });

    await expect(
      closeRankingSeason(dataSource as never, '2026-09'),
    ).resolves.toBe(true);

    expect(emissor).not.toHaveBeenCalled();
  });

  it('não emite quando ninguém pontuou', async () => {
    const { dataSource, emissor } = montar({ snapshot: [] });

    await closeRankingSeason(dataSource as never, '2026-09');

    expect(emissor).not.toHaveBeenCalled();
  });

  it('falha ao ler o snapshot não desfaz o fechamento', async () => {
    const { dataSource, emissor } = montar({});
    const original = dataSource.query.getMockImplementation()!;
    dataSource.query.mockImplementation((sql: string) =>
      sql.includes('FROM ranking_season_snapshot')
        ? Promise.reject(new Error('banco fora'))
        : original(sql),
    );

    await expect(
      closeRankingSeason(dataSource as never, '2026-09'),
    ).resolves.toBe(true);
    expect(emissor).not.toHaveBeenCalled();
  });

  it('calcula posições de centenas de alunos por escola, com empate dividindo a posição', () => {
    const linhas = Array.from({ length: 600 }, (_, indice) => ({
      usuario_id: indice + 1,
      points: String(1000 - Math.floor(indice / 2)),
      empresa_id: indice % 2 === 0 ? 1 : 2,
    }));

    const posicoes = calcularPosicoes(linhas);

    expect(posicoes).toHaveLength(600);
    const doPrimeiro = posicoes.find((item) => item.usuarioId === 1)!;
    expect(doPrimeiro).toEqual({ usuarioId: 1, posicao: 1, pontos: 1000 });
    const ultimo = posicoes.find((item) => item.usuarioId === 599)!;
    expect(ultimo.posicao).toBe(300);
    // Cada escola tem posições de 1 a 300: ninguém compara com outra escola.
    expect(Math.max(...posicoes.map((item) => item.posicao))).toBe(300);
  });
});
