import { arcadeReward, legacyArcadeDayKeys } from './arcade-rewards';

describe('Regras de recompensa do arcade', () => {
  it.each([
    [1, 1, 100],
    [2, 0.5, 50],
    [3, 0.25, 25],
    [10, 0.25, 25],
  ])(
    'partida %i aplica multiplicador %f e XP %i',
    (plays, multiplier, xpEarned) => {
      expect(arcadeReward(100, 100, plays)).toMatchObject({
        multiplier,
        xpEarned,
      });
    },
  );
  it('mantém piso positivo e não aplica piso quando não houve acerto', () => {
    expect(arcadeReward(20, 100, 3).xpEarned).toBe(10);
    expect(arcadeReward(0, 100, 3).xpEarned).toBe(0);
  });
  it('soma as duas chaves legadas quando o fuso UTC dividiu o dia de São Paulo', () => {
    // Jest isola process.env; modelar explicitamente os getters do host UTC.
    const year = jest
      .spyOn(Date.prototype, 'getFullYear')
      .mockImplementation(function (this: Date) {
        return this.getUTCFullYear();
      });
    const month = jest
      .spyOn(Date.prototype, 'getMonth')
      .mockImplementation(function (this: Date) {
        return this.getUTCMonth();
      });
    const day = jest
      .spyOn(Date.prototype, 'getDate')
      .mockImplementation(function (this: Date) {
        return this.getUTCDate();
      });
    try {
      expect(
        legacyArcadeDayKeys(
          7,
          'quiz-relampago',
          new Date('2026-10-27T02:00:00Z'),
        ),
      ).toEqual([
        'arcade-plays:7:quiz-relampago:2026-10-26',
        'arcade-plays:7:quiz-relampago:2026-10-27',
      ]);
    } finally {
      year.mockRestore();
      month.mockRestore();
      day.mockRestore();
    }
  });
});
