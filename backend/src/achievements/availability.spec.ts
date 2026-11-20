import { isOnSale } from './availability';

describe('isOnSale', () => {
  const until = new Date('2026-12-31T23:59:59-03:00');
  const from = new Date('2026-11-01T00:00:00-03:00');

  it('item sem datas está à venda', () => {
    expect(isOnSale({ available_from: null, available_until: null })).toBe(
      true,
    );
  });

  it('respeita o fim em horário de Brasília', () => {
    const item = { available_from: null, available_until: until };
    expect(isOnSale(item, new Date('2026-12-31T23:30:00-03:00'))).toBe(true);
    expect(isOnSale(item, new Date('2027-01-01T00:00:01-03:00'))).toBe(false);
  });

  it('antes do início está fora', () => {
    const item = { available_from: from, available_until: null };
    expect(isOnSale(item, new Date('2026-10-31T23:59:59-03:00'))).toBe(false);
    expect(isOnSale(item, from)).toBe(true);
  });
});
