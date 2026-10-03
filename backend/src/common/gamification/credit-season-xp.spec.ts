import { creditSeasonXp } from './credit-season-xp';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';

describe('creditSeasonXp', () => {
  it('locks the season before choosing it and writes total and monthly XP in one transaction', async () => {
    const calls: string[] = [];
    const stats = { usuario_id: 7, total_points: 20 };
    const statsRepo = {
      findOne: jest.fn(() => Promise.resolve(stats)),
      save: jest.fn(() => {
        calls.push('total');
        return Promise.resolve();
      }),
    };
    const lock = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOneOrFail: jest.fn(() => {
        calls.push('user-lock');
        return Promise.resolve({ id: 7 });
      }),
    };
    const manager = {
      query: jest.fn((sql: string) => {
        calls.push(
          sql.includes('LOCK IN SHARE MODE') ? 'season-lock' : 'season-points',
        );
        return Promise.resolve([]);
      }),
      getRepository: jest.fn((entity) =>
        entity === UsuarioStats
          ? statsRepo
          : { createQueryBuilder: () => lock },
      ),
    };
    const repository = {
      manager: {
        query: jest
          .fn()
          .mockResolvedValue([
            { start_local_at: '2026-10-03 00:00:00.000000' },
          ]),
        transaction: jest.fn(
          (callback: (value: typeof manager) => Promise<number>) =>
            callback(manager),
        ),
      },
    };
    Object.assign(repository.manager, {
      connection: {
        query: jest.fn((sql: string) =>
          Promise.resolve(
            sql.includes('DATE_FORMAT')
              ? [{ start_local_at: '2026-10-03 00:00:00.000000' }]
              : [{ id: 1 }],
          ),
        ),
      },
    });
    await expect(creditSeasonXp(repository as never, 7, 5)).resolves.toBe(20);
    expect(stats.total_points).toBe(25);
    expect(calls).toEqual([
      'season-lock',
      'user-lock',
      'total',
      'season-points',
    ]);
    expect(manager.query).toHaveBeenLastCalledWith(
      expect.stringContaining(
        'ON DUPLICATE KEY UPDATE points = points + VALUES(points)',
      ),
      expect.arrayContaining([7, 5]),
    );
  });

  it('propagates a monthly-write failure so the transaction can roll back the total', async () => {
    const statsRepo = {
      findOne: jest.fn().mockResolvedValue({ usuario_id: 7, total_points: 20 }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const lock = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOneOrFail: jest.fn().mockResolvedValue({ id: 7 }),
    };
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('monthly write failed')),
      getRepository: jest.fn((entity) =>
        entity === UsuarioStats
          ? statsRepo
          : { createQueryBuilder: () => lock },
      ),
    };
    const repository = {
      manager: {
        query: jest
          .fn()
          .mockResolvedValue([
            { start_local_at: '2026-10-03 00:00:00.000000' },
          ]),
        transaction: jest.fn(
          (callback: (value: typeof manager) => Promise<number>) =>
            callback(manager),
        ),
      },
    };
    Object.assign(repository.manager, {
      connection: {
        query: jest.fn((sql: string) =>
          Promise.resolve(
            sql.includes('DATE_FORMAT')
              ? [{ start_local_at: '2026-10-03 00:00:00.000000' }]
              : [{ id: 1 }],
          ),
        ),
      },
    });
    await expect(creditSeasonXp(repository as never, 7, 5)).rejects.toThrow(
      'monthly write failed',
    );
    expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
  });
});
