
export function now(): Date {
  return new Date();
}

export function endOfDay(date: Date = now()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0);
}

export function ttlUntilEndOfDay(): number {
  const current = now();
  return Math.floor((endOfDay(current).getTime() - current.getTime()) / 1000);
}
