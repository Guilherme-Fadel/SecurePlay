import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { LoginAttemptsService } from './login-attempts.service';
import { MemoryRedis } from './login-attempts-test-support';
import { encryptMfaSecret } from './mfa/mfa-crypto';
import { FakeMfaStore, FakeRedis, contaDeTeste } from './mfa/mfa-test-support';
import { MfaService } from './mfa/mfa.service';
import { base32Decode, generateTotpSecret, totpCode } from './mfa/totp';

const SENHA = 'senha-forte-de-teste';
const CHAVE = 'chave-mfa-de-teste-com-mais-de-32-caracteres';

async function montar() {
  process.env.JWT_SECRET = 'segredo-jwt-de-teste-com-mais-de-32-caracteres';
  process.env.MFA_ENCRYPTION_KEY = CHAVE;
  const secret = generateTotpSecret();
  const conta = contaDeTeste({
    password: await bcrypt.hash(SENHA, 4),
    mfa_enabled_at: new Date(),
    mfa_secret_encrypted: encryptMfaSecret(secret, CHAVE),
    mfa_recovery_codes: [],
  });
  const jwt = new JwtService({ secret: 'x'.repeat(40) });
  const attempts = new LoginAttemptsService(new MemoryRedis() as never);
  const mfa = new MfaService(
    new FakeMfaStore(new Map([[conta.id, conta]])) as never,
    jwt,
    new FakeRedis() as never,
    attempts,
  );
  const auth = new AuthService(
    {
      getUsuarioByLoginIdentifier: () => Promise.resolve(conta),
    } as never,
    jwt,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    attempts,
    mfa,
  );
  const status = (p: Promise<unknown>) =>
    p.then(
      () => 200,
      (error: { getStatus?: () => number }) => error.getStatus?.() ?? 500,
    );
  const entrar = async () => {
    const res = (await auth.signIn({
      email: conta.email ?? '',
      password: SENHA,
    })) as { challengeToken: string };
    return res.challengeToken;
  };
  const codigoErrado = (desafio: string) =>
    status(mfa.verify(desafio, { code: '000000' }));
  const codigoCerto = (desafio: string) =>
    mfa.verify(desafio, {
      code: totpCode(base32Decode(secret), Date.now()),
    });
  return { entrar, codigoErrado, codigoCerto, auth, status };
}

describe('bloqueio por conta com MFA', () => {
  const ambiente = { ...process.env };
  afterEach(() => {
    process.env = { ...ambiente };
  });

  it('senha certa entre erros de MFA não zera o bloqueio', async () => {
    const { entrar, codigoErrado } = await montar();
    let desafio = await entrar(); // tentativa 1
    for (let i = 0; i < 2; i++) expect(await codigoErrado(desafio)).toBe(401); // 2 e 3
    // Login com a senha certa (tentativa 4): conta como tentativa e NÃO zera nada.
    desafio = await entrar();
    expect(await codigoErrado(desafio)).toBe(401); // tentativa 5, liga o bloqueio
    expect(await codigoErrado(desafio)).toBe(429);
  });

  it('login com a senha certa após 4 tentativas liga o bloqueio e a conta trava', async () => {
    const { entrar, codigoErrado, status, auth } = await montar();
    const desafio = await entrar(); // tentativa 1
    for (let i = 0; i < 3; i++) expect(await codigoErrado(desafio)).toBe(401);
    await entrar(); // 5ª tentativa: avaliada, liga o bloqueio sem zerar
    expect(await codigoErrado(desafio)).toBe(429);
    expect(
      await status(
        auth.signIn({ email: 'gestao@example.test', password: SENHA }),
      ),
    ).toBe(429);
  });

  it('mfa/verify com sucesso zera o contador', async () => {
    const { entrar, codigoErrado, codigoCerto } = await montar();
    const desafio = await entrar();
    for (let i = 0; i < 2; i++) await codigoErrado(desafio);
    await codigoCerto(desafio);
    for (let i = 0; i < 4; i++) expect(await codigoErrado(desafio)).toBe(401);
  });
});
