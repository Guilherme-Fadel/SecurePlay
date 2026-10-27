import { calcLevel, calcXpToNextLevel } from './xp.utils';

describe('zero-based XP levels', () => {
  it.each([
    [0, 0, 1000],
    [219, 0, 781],
    [999, 0, 1],
    [1000, 1, 1000],
    [1999, 1, 1],
    [2000, 2, 1000],
    [2219, 2, 781],
    [2999, 2, 1],
    [3000, 3, 1000],
  ])('%i XP => level %i, %i XP remaining', (xp, level, remaining) => {
    expect(calcLevel(xp)).toBe(level);
    expect(calcXpToNextLevel(xp)).toBe(remaining);
  });
});
