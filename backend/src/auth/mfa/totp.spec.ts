import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  hotp,
  otpauthUrl,
  totpCode,
  totpStep,
  verifyTotp,
} from './totp';

describe('TOTP (RFC 6238)', () => {
  const chaveRfc = Buffer.from('12345678901234567890', 'ascii');

  it('bate com o vetor do RFC 6238 em T=59 s (8 dígitos: 94287082)', () => {
    expect(totpCode(chaveRfc, 59_000, 8)).toBe('94287082');
  });

  it('a versão de 6 dígitos do mesmo vetor é 287082', () => {
    expect(totpCode(chaveRfc, 59_000)).toBe('287082');
  });

  it('bate com vetores do RFC 4226 (contador 0 e 1)', () => {
    expect(hotp(chaveRfc, 0)).toBe('755224');
    expect(hotp(chaveRfc, 1)).toBe('287082');
  });

  it('base32 faz ida e volta e segue o RFC 4648', () => {
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
    expect(base32Decode('MZXW6YTBOI======').toString()).toBe('foobar');
    const segredo = generateTotpSecret();
    expect(segredo).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(segredo))).toBe(segredo);
    expect(base32Decode(segredo)).toHaveLength(20);
  });

  it('rejeita caractere fora do alfabeto base32', () => {
    expect(() => base32Decode('MZXW1')).toThrow();
  });

  it('aceita o passo atual e ±1, mas não ±2', () => {
    const segredo = base32Encode(chaveRfc);
    const agora = 1_700_000_000_000;
    const passo = totpStep(agora);
    const codigoDoPasso = (p: number) => hotp(chaveRfc, p);
    expect(verifyTotp(segredo, codigoDoPasso(passo), agora)).toBe(passo);
    expect(verifyTotp(segredo, codigoDoPasso(passo - 1), agora)).toBe(
      passo - 1,
    );
    expect(verifyTotp(segredo, codigoDoPasso(passo + 1), agora)).toBe(
      passo + 1,
    );
    expect(verifyTotp(segredo, codigoDoPasso(passo - 2), agora)).toBeNull();
    expect(verifyTotp(segredo, codigoDoPasso(passo + 2), agora)).toBeNull();
  });

  it('recusa código malformado ou segredo inválido', () => {
    const segredo = base32Encode(chaveRfc);
    expect(verifyTotp(segredo, '12345', 59_000)).toBeNull();
    expect(verifyTotp(segredo, 'abcdef', 59_000)).toBeNull();
    expect(verifyTotp('1!!', '287082', 59_000)).toBeNull();
  });

  it('monta o otpauth:// com a conta codificada por URL', () => {
    const url = otpauthUrl('ana+gestao@example.test', 'ABCDEFGH');
    expect(url).toBe(
      'otpauth://totp/SecurePlay:ana%2Bgestao%40example.test?secret=ABCDEFGH' +
        '&issuer=SecurePlay&algorithm=SHA1&digits=6&period=30',
    );
  });
});
