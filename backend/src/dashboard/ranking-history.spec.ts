import {
  validateRankingSelection,
  rankingHistoryContext,
  closeRankingSeason,
  hasFullSeasonCoverage,
  ensureRankingTracking,
} from './ranking-history';

describe('ranking history selection', () => {
  it('rejects invalid modes, future seasons and season on total mode', () => {
    expect(() => validateRankingSelection('unknown')).toThrow();
    expect(() => validateRankingSelection('total', '2026-09')).toThrow();
    expect(() => validateRankingSelection('season', '2027-01')).toThrow();
    expect(() => validateRankingSelection('season', '2026-00')).toThrow();
  });

  it('marks seasons before tracking as unavailable', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValue([{ start_local_at: '2026-10-03 00:00:00.000000' }]),
    };
    const context = await rankingHistoryContext(
      dataSource as never,
      'season',
      '2026-09',
    );
    expect(context.dataCompleteness).toBe('unavailable');
    expect(
      context.availableSeasons.find((season) => season.id === '2026-09')
        ?.completeness,
    ).toBe('unavailable');
  });

  it('requires tracking from the exact local start of a month', () => {
    expect(hasFullSeasonCoverage('2026-11-01 00:00:00.000000', '2026-11')).toBe(
      true,
    );
    expect(hasFullSeasonCoverage('2026-11-01 00:00:00.000001', '2026-11')).toBe(
      false,
    );
    expect(hasFullSeasonCoverage('2026-10-31 23:59:59.999999', '2026-11')).toBe(
      true,
    );
  });

  it('creates the singleton tracking row if schema synchronization left it empty', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValueOnce([]).mockResolvedValue([]),
    };
    await ensureRankingTracking(dataSource as never);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ranking_tracking'),
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('start_local_at = UTC_TIMESTAMP'),
    );
  });

  it('serializes finalization and records frozen participants before close marker', async () => {
    const statements: string[] = [];
    const manager = {
      query: jest.fn(async (sql: string) => {
        statements.push(sql);
        return [];
      }),
    };
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValue([{ start_local_at: '2026-09-01 00:00:00.000000' }]),
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    await expect(
      closeRankingSeason(dataSource as never, '2026-09'),
    ).resolves.toBe(true);
    expect(statements[0]).toContain('FOR UPDATE');
    expect(
      statements.findIndex((sql) =>
        sql.includes('INSERT INTO ranking_season_snapshot'),
      ),
    ).toBeLessThan(
      statements.findIndex((sql) =>
        sql.includes('INSERT INTO ranking_season_close'),
      ),
    );
  });
});
