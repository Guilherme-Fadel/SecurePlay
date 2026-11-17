import { createHash } from 'node:crypto';
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from './recovery-codes';

describe('códigos de recuperação', () => {
  it('gera 8 códigos XXXX-XXXX sem caracteres ambíguos e sem repetição', () => {
    const codigos = generateRecoveryCodes();
    expect(codigos).toHaveLength(8);
    expect(new Set(codigos).size).toBe(8);
    for (const codigo of codigos)
      expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it('normaliza maiúsculas, hífen e espaços antes do hash', () => {
    expect(normalizeRecoveryCode(' ab2c-d3ef ')).toBe('AB2CD3EF');
    expect(hashRecoveryCode('ab2c-d3ef', 'k')).toBe(
      hashRecoveryCode('AB2CD3EF', 'k'),
    );
    expect(hashRecoveryCode('AB2C-D3EF', 'k')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('o hash depende da chave e não é o SHA-256 simples do código', () => {
    expect(hashRecoveryCode('AB2C-D3EF', 'chave-a')).not.toBe(
      hashRecoveryCode('AB2C-D3EF', 'chave-b'),
    );
    expect(hashRecoveryCode('AB2C-D3EF', 'chave-a')).not.toBe(
      createHash('sha256').update('AB2CD3EF').digest('hex'),
    );
  });
});
