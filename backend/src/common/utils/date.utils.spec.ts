import {
  APPLICATION_TIME_ZONE,
  endOfDay,
  getLocalDateKey,
  getMondayOfWeek,
  getTodayWeekIndex,
  ttlUntilEndOfDay,
  ttlUntilEndOfWeek,
} from './date.utils';

describe('date utils no fuso da aplicação', () => {
  const fridayAtNineTwentyFivePm = new Date('2026-09-05T00:25:00.000Z');

  it('usa explicitamente o fuso de São Paulo', () => {
    expect(APPLICATION_TIME_ZONE).toBe('America/Sao_Paulo');
  });

  it('mantém sexta-feira antes da meia-noite de Brasília', () => {
    expect(getLocalDateKey(fridayAtNineTwentyFivePm)).toBe('2026-09-04');
    expect(getTodayWeekIndex(fridayAtNineTwentyFivePm)).toBe(4);
    expect(getMondayOfWeek(fridayAtNineTwentyFivePm)).toBe('2026-08-31');
  });

  it('vira para sábado somente à meia-noite de Brasília', () => {
    const saturdayAtMidnight = new Date('2026-09-05T03:00:00.000Z');
    expect(getLocalDateKey(saturdayAtMidnight)).toBe('2026-09-05');
    expect(getTodayWeekIndex(saturdayAtMidnight)).toBe(5);
  });

  it('calcula a expiração diária pela meia-noite de Brasília', () => {
    expect(endOfDay(fridayAtNineTwentyFivePm).toISOString()).toBe(
      '2026-09-05T03:00:00.000Z',
    );
    expect(ttlUntilEndOfDay(fridayAtNineTwentyFivePm)).toBe(9_300);
  });

  it('calcula a expiração semanal pela próxima segunda em Brasília', () => {
    expect(ttlUntilEndOfWeek(fridayAtNineTwentyFivePm)).toBe(182_100);
  });
});
