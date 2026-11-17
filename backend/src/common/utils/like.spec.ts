import { CLAUSULA_ESCAPE_LIKE, padraoLike } from './like';

describe('padraoLike', () => {
  it('mantém texto comum e apenas o envolve com %', () => {
    expect(padraoLike('Escola Central')).toBe('%Escola Central%');
  });

  it('escapa o curinga %', () => {
    expect(padraoLike('%')).toBe('%\\%%');
    expect(padraoLike('50%')).toBe('%50\\%%');
  });

  it('escapa o curinga _', () => {
    expect(padraoLike('a_b')).toBe('%a\\_b%');
  });

  it('escapa o próprio caractere de escape', () => {
    expect(padraoLike('a\\b')).toBe('%a\\\\b%');
  });

  it('escapa todas as ocorrências combinadas', () => {
    expect(padraoLike('\\%_')).toBe('%\\\\\\%\\_%');
  });

  it('expõe a cláusula ESCAPE com uma barra invertida em SQL', () => {
    expect(CLAUSULA_ESCAPE_LIKE).toBe("ESCAPE '\\\\'");
  });
});
