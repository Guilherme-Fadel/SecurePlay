import { decryptMfaSecret, encryptMfaSecret } from './mfa-crypto';

describe('cifra do segredo de MFA (AES-256-GCM)', () => {
  const chave = 'chave-de-teste-do-mfa';

  it('faz a ida e volta no formato v1:iv:tag:cifrado', () => {
    const cifrado = encryptMfaSecret('JBSWY3DPEHPK3PXP', chave);
    const partes = cifrado.split(':');
    expect(partes).toHaveLength(4);
    expect(partes[0]).toBe('v1');
    expect(Buffer.from(partes[1], 'base64')).toHaveLength(12);
    expect(cifrado).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptMfaSecret(cifrado, chave)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('usa IV novo a cada cifra', () => {
    expect(encryptMfaSecret('x', chave)).not.toBe(encryptMfaSecret('x', chave));
  });

  it('falha se o conteúdo for adulterado', () => {
    const [v, iv, tag, dados] = encryptMfaSecret('SEGREDO', chave).split(':');
    const bytes = Buffer.from(dados, 'base64');
    bytes[0] ^= 1;
    const adulterado = [v, iv, tag, bytes.toString('base64')].join(':');
    expect(() => decryptMfaSecret(adulterado, chave)).toThrow();
  });

  it('falha se a etiqueta de autenticação for adulterada', () => {
    const [v, iv, tag, dados] = encryptMfaSecret('SEGREDO', chave).split(':');
    const bytes = Buffer.from(tag, 'base64');
    bytes[0] ^= 1;
    const adulterado = [v, iv, bytes.toString('base64'), dados].join(':');
    expect(() => decryptMfaSecret(adulterado, chave)).toThrow();
  });

  it('falha com a chave errada ou formato desconhecido', () => {
    const cifrado = encryptMfaSecret('SEGREDO', chave);
    expect(() => decryptMfaSecret(cifrado, 'outra-chave')).toThrow();
    expect(() => decryptMfaSecret('v2:a:b:c', chave)).toThrow();
    expect(() => decryptMfaSecret('lixo', chave)).toThrow();
  });
});
