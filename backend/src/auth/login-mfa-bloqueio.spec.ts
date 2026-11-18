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

  it('login com a senha certa é neutro no contador: vários logins e o código certo não dão 429', async () => {
    const { entrar, codigoCerto } = await montar();
    let desafio = await entrar();
    for (let i = 0; i < 8; i++) desafio = await entrar();
    const { user } = await codigoCerto(desafio);
    expect(user.id).toBe(7);
  });

  it('senha certa entre erros de MFA não zera o contador nem o bloqueio', async () => {
    const { entrar, codigoErrado } = await montar();
    let desafio = await entrar();
    for (let i = 0; i < 2; i++) expect(await codigoErrado(desafio)).toBe(401); // 1 e 2
    desafio = await entrar(); // neutro: não conta e não zera
    for (let i = 0; i < 2; i++) expect(await codigoErrado(desafio)).toBe(401); // 3 e 4
    expect(await codigoErrado(desafio)).toBe(401); // 5ª, liga o bloqueio
    expect(await codigoErrado(desafio)).toBe(429);
  });

  it('5 códigos errados bloqueiam e, durante o bloqueio, nem a senha certa entra', async () => {
    const { entrar, codigoErrado, status, auth } = await montar();
    const desafio = await entrar();
    for (let i = 0; i < 5; i++) expect(await codigoErrado(desafio)).toBe(401);
    expect(await codigoErrado(desafio)).toBe(429);
    expect(
      await status(
        auth.signIn({ email: 'gestao@example.test', password: SENHA }),
      ),
    ).toBe(429);
    // A senha certa recusada não zerou o bloqueio.
    expect(await codigoErrado(desafio)).toBe(429);
  });

  it('senha errada continua contando e bloqueia na 5ª', async () => {
    const { status, auth } = await montar();
    const errada = () =>
      status(auth.signIn({ email: 'gestao@example.test', password: 'x' }));
    const resultados: number[] = [];
    for (let i = 0; i < 6; i++) resultados.push(await errada());
    expect(resultados).toEqual([401, 401, 401, 401, 401, 429]);
  });

  it('mfa/verify com sucesso zera o contador', async () => {
    const { entrar, codigoErrado, codigoCerto } = await montar();
    const desafio = await entrar();
    for (let i = 0; i < 2; i++) await codigoErrado(desafio);
    await codigoCerto(desafio);
    for (let i = 0; i < 4; i++) expect(await codigoErrado(desafio)).toBe(401);
  });
});
