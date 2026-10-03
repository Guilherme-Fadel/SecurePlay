import { DashboardService } from './dashboard.service';

describe('ranking season closure lifecycle', () => {
  const originalDate = Date;
  afterEach(() => {
    jest.useRealTimers();
    expect(Date).toBe(originalDate);
  });

  function buildService() {
    const closed = new Set<string>();
    const manager = {
      query: jest.fn((sql: string, params?: unknown[]) => {
        if (sql.includes('SELECT season_id FROM ranking_season_close')) {
          return Promise.resolve(
            closed.has(params?.[0] as string)
              ? [{ season_id: params?.[0] }]
              : [],
          );
        }
        if (sql.includes('INSERT INTO ranking_season_close'))
          closed.add(params?.[0] as string);
        return Promise.resolve([]);
      }),
    };
    const dataSource = {
      query: jest.fn((sql: string) => {
        if (sql.includes('DATE_FORMAT'))
          return Promise.resolve([
            { start_local_at: '2026-10-01 00:00:00.000000' },
          ]);
        return Promise.resolve([{ id: 1 }]);
      }),
      transaction: jest.fn(
        (callback: (value: typeof manager) => Promise<unknown>) =>
          callback(manager),
      ),
    };
    const service = new DashboardService(
      {} as never,
      dataSource as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, dataSource, closed };
  }

  it('closes a full previous season during startup', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-03T12:00:00-03:00'));
    const { service, closed } = buildService();
    await service.onModuleInit();
    expect(closed.has('2026-10')).toBe(true);
    await service.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rearms across the boundary and closes before the next month is served', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-31T23:59:50-03:00'));
    const { service, closed } = buildService();
    await service.onModuleInit();
    expect(closed.has('2026-10')).toBe(false);
    await jest.advanceTimersByTimeAsync(11_500);
    expect(closed.has('2026-10')).toBe(true);
    await service.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(0);
  });
});
