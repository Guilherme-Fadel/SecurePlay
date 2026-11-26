import {
  CHARACTER_COLORS,
  defaultCharacterColor,
  isCharacterColor,
  resolveCharacterColor,
} from './character-color';

describe('character-color', () => {
  it('mantém a ordem do contrato com o front', () => {
    expect([...CHARACTER_COLORS]).toEqual([
      'azul',
      'laranja',
      'rosa',
      'preto',
      'vermelho',
    ]);
  });

  // Vetores calculados com h = (h * 31 + charCode) >>> 0, índice h % 5 (rankingAvatarTone.ts).
  it.each([
    ['0123456789abcdef', 'rosa'],
    ['a', 'rosa'],
    ['ffffffffffffffff', 'preto'],
    ['abcd1234abcd1234', 'laranja'],
  ])('defaultCharacterColor(%s) = %s', (key, expected) => {
    expect(defaultCharacterColor(key)).toBe(expected);
  });

  it('isCharacterColor só aceita as cinco cores exatas', () => {
    for (const color of CHARACTER_COLORS)
      expect(isCharacterColor(color)).toBe(true);
    for (const bad of ['verde', 'AZUL', '', null, undefined, 1])
      expect(isCharacterColor(bad)).toBe(false);
  });

  it('resolveCharacterColor prefere a escolhida e cai na padrão', () => {
    expect(resolveCharacterColor('vermelho', 'a')).toEqual({
      color: 'vermelho',
      chosen: true,
    });
    expect(resolveCharacterColor(null, 'a')).toEqual({
      color: 'rosa',
      chosen: false,
    });
  });
});
