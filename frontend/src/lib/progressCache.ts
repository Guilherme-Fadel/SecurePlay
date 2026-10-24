import { invalidate, invalidatePrefix } from './queryCache';

/** Refresh every view affected by a completed activity after the server commits it. */
export function invalidateProgress() {
  for (const key of [
    'dashboardStats', 'weeklyStreak', 'dashboardDaily', 'dashboardJourney',
    'conteudoModulos', 'achievementRecent', 'achievementTrail', 'achievementShop',
  ]) invalidate(key);
  invalidatePrefix('dashboardRanking');
  invalidatePrefix('challenge-status');
}
