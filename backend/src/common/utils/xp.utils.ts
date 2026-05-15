const XP_PER_LEVEL = 1000;

export function calcLevel(totalPoints: number): number {
  return Math.floor(totalPoints / XP_PER_LEVEL) + 1;
}

export function calcXpToNextLevel(totalPoints: number): number {
  return XP_PER_LEVEL - (totalPoints % XP_PER_LEVEL);
}
