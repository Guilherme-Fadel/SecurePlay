export const APPLICATION_TIME_ZONE = 'America/Sao_Paulo';

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface CalendarDateTime extends CalendarDate {
  hour: number;
  minute: number;
  second: number;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APPLICATION_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function getCalendarDateTime(date: Date): CalendarDateTime {
  const values = Object.fromEntries(
    dateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function shiftCalendarDate(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day + days),
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function getTimeZoneOffsetMs(date: Date): number {
  const local = getCalendarDateTime(date);
  const localAsUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );
  const instantWithoutMilliseconds = Math.floor(date.getTime() / 1000) * 1000;
  return localAsUtc - instantWithoutMilliseconds;
}

function calendarDateTimeToInstant(date: CalendarDateTime): Date {
  const localAsUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    date.hour,
    date.minute,
    date.second,
  );
  let instant = localAsUtc;

  // Duas passagens resolvem inclusive uma eventual troca de offset do fuso.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const adjusted = localAsUtc - getTimeZoneOffsetMs(new Date(instant));
    if (adjusted === instant) break;
    instant = adjusted;
  }

  return new Date(instant);
}

function formatCalendarDate(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function getCalendarWeekday(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

export function now(): Date {
  return new Date();
}

/** Retorna o instante correspondente à próxima meia-noite em São Paulo. */
export function endOfDay(date: Date = now()): Date {
  const nextDay = shiftCalendarDate(getCalendarDateTime(date), 1);
  return calendarDateTimeToInstant({
    ...nextDay,
    hour: 0,
    minute: 0,
    second: 0,
  });
}

export function ttlUntilEndOfDay(date: Date = now()): number {
  return Math.max(
    1,
    Math.ceil((endOfDay(date).getTime() - date.getTime()) / 1000),
  );
}

/** Retorna o TTL até a próxima segunda-feira, 00:00, em São Paulo. */
export function ttlUntilEndOfWeek(date: Date = now()): number {
  const local = getCalendarDateTime(date);
  const todayIndex = getTodayWeekIndex(date);
  const nextMonday = shiftCalendarDate(local, 7 - todayIndex);
  const endOfWeek = calendarDateTimeToInstant({
    ...nextMonday,
    hour: 0,
    minute: 0,
    second: 0,
  });
  return Math.max(1, Math.ceil((endOfWeek.getTime() - date.getTime()) / 1000));
}

export function getLocalDateKey(date: Date = now()): string {
  return formatCalendarDate(getCalendarDateTime(date));
}

export function getMondayOfWeek(date: Date = now()): string {
  const local = getCalendarDateTime(date);
  const weekday = getCalendarWeekday(local);
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return formatCalendarDate(shiftCalendarDate(local, -daysSinceMonday));
}

export function getTodayWeekIndex(date: Date = now()): number {
  const weekday = getCalendarWeekday(getCalendarDateTime(date));
  return weekday === 0 ? 6 : weekday - 1;
}
