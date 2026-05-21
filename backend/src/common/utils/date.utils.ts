
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


export function ttlUntilEndOfWeek(): number {
  const current = now();
  const day = current.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const endOfWeek = new Date(current);
  endOfWeek.setDate(current.getDate() + daysUntilSunday);
  endOfWeek.setHours(23, 59, 59, 999);
  return Math.ceil((endOfWeek.getTime() - current.getTime()) / 1000);
}

export function getMondayOfWeek(date: Date = now()): string {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export function getTodayWeekIndex(date: Date = now()): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}
