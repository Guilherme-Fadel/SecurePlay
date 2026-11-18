import { Logger } from '@nestjs/common';
import { Role } from '../roles.enum';
import { MFA_CHALLENGE_COOKIE } from './mfa-challenge';
import { CenarioMfa, criarCenarioMfa } from './mfa-http-fixture';
import { hashRecoveryCode } from './recovery-codes';

const CHAVE_MFA = 'chave-mfa-de-teste-com-mais-de-32-caracteres';

describe('HTTP: MFA por TOTP para gestão', () => {
  let c: CenarioMfa;

  beforeEach(async () => {
    c = await criarCenarioMfa();
  });

  afterEach(async () => {
    await c.encerrar();
  });

  it('admin sem MFA é levado ao cadastro, sem cookie de sessão', async () => {
    const res = await c.entrar();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      requiresMfa: true,
      mfaSetupRequired: true,
      message: expect.any(String) as string,
    });
    expect(c.cookieDe(res, 'token')).toBeUndefined();
    const desafio = res.cookies.find(
      (item) => item.name === MFA_CHALLENGE_COOKIE,
    ) as { httpOnly?: boolean; maxAge?: number };
    expect(desafio.httpOnly).toBe(true);
    expect(desafio.maxAge).toBe(1800);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('admin com MFA ativo recebe o desafio sem pedir cadastro', async () => {
    await c.cadastrar();
    const res = await c.entrar();
    expect(res.json()).toMatchObject({
      requiresMfa: true,
      mfaSetupRequired: false,
    });
    expect(c.cookieDe(res, 'token')).toBeUndefined();
  });

  it('cadastro: setup, verify com o código certo, sessão, 8 códigos e só hashes gravados', async () => {
    const desafio = await c.desafioDe();
    const setup = await c.post('/auth/mfa/setup', desafio);
    expect(setup.statusCode).toBe(200);
    const { secret, otpauthUrl } = setup.json<{
      secret: string;
      otpauthUrl: string;
    }>();
    expect(otpauthUrl).toContain(`secret=${secret}`);
    expect(otpauthUrl).toContain('SecurePlay:gestao%40example.test');
    const guardado = c.contas.get(7)!;
    expect(guardado.mfa_secret_encrypted).toMatch(/^v1:/);
    expect(guardado.mfa_secret_encrypted).not.toContain(secret);
    expect(guardado.mfa_enabled_at).toBeNull();

    const res = await c.post('/auth/mfa/verify', desafio, {
      code: c.codigoAtual(secret),
    });
    expect(res.statusCode).toBe(200);
    const corpo = res.json<{
      nome: string;
      user: { userId: number };
      recoveryCodes: string[];
    }>();
    expect(corpo.nome).toBe('Gestão');
    expect(corpo.user.userId).toBe(7);
    expect(corpo.recoveryCodes).toHaveLength(8);
    expect(c.cookieDe(res, 'token')?.value).toBeTruthy();
    expect(c.cookieDe(res, MFA_CHALLENGE_COOKIE)?.value ?? '').toBe('');
    expect(res.headers['cache-control']).toBe('private, no-store');

    expect(guardado.mfa_enabled_at).toBeInstanceOf(Date);
    expect(guardado.mfa_recovery_codes).toEqual(
      corpo.recoveryCodes.map((item) => hashRecoveryCode(item, CHAVE_MFA)),
    );
    for (const codigo of corpo.recoveryCodes)
      expect(JSON.stringify(guardado.mfa_recovery_codes)).not.toContain(codigo);
    expect(c.attempts.zerados).toContain('u:7');

    const sessao = await c.app.inject({
      method: 'GET',
      url: '/sonda/protegida',
      headers: { cookie: `token=${c.cookieDe(res, 'token')?.value}` },
    });
    expect(sessao.statusCode).toBe(200);
  });

  it('setup repetido enquanto pendente devolve o mesmo segredo e o código continua valendo', async () => {
    const desafio = await c.desafioDe();
    const primeiro = (await c.post('/auth/mfa/setup', desafio)).json<{
      secret: string;
      otpauthUrl: string;
    }>();
    const segundo = (await c.post('/auth/mfa/setup', desafio)).json<{
      secret: string;
      otpauthUrl: string;
    }>();
    expect(segundo.secret).toBe(primeiro.secret);
    expect(segundo.otpauthUrl).toBe(primeiro.otpauthUrl);
    const res = await c.post('/auth/mfa/verify', desafio, {
      code: c.codigoAtual(primeiro.secret),
    });
    expect(res.statusCode).toBe(200);
  });

  it('segredo pendente ilegível é substituído por um novo', async () => {
    const desafio = await c.desafioDe();
    c.contas.get(7)!.mfa_secret_encrypted = 'v1:lixo:lixo:lixo';
    const res = await c.post('/auth/mfa/setup', desafio);
    expect(res.statusCode).toBe(200);
    const { secret } = res.json<{ secret: string }>();
    expect(secret).toEqual(expect.any(String));
    expect(c.contas.get(7)!.mfa_secret_encrypted).not.toBe('v1:lixo:lixo:lixo');
  });

  it('o desafio de cadastro vale 30 min e o de conta já protegida 5 min', async () => {
    const cadastro = (await c.entrar()).cookies.find(
      (item) => item.name === MFA_CHALLENGE_COOKIE,
    ) as { value: string; maxAge?: number };
    expect(cadastro.maxAge).toBe(1800);
    const pc = c.jwt.decode<{ iat: number; exp: number }>(cadastro.value);
    expect(pc.exp - pc.iat).toBe(1800);

    await c.cadastrar();
    const ativo = (await c.entrar()).cookies.find(
      (item) => item.name === MFA_CHALLENGE_COOKIE,
    ) as { value: string; maxAge?: number };
    expect(ativo.maxAge).toBe(300);
    const pa = c.jwt.decode<{ iat: number; exp: number }>(ativo.value);
    expect(pa.exp - pa.iat).toBe(300);
  });

  it('o setup regrava o cookie do desafio com o prazo do cadastro e sem token no corpo', async () => {
    const desafio = await c.desafioDe();
    c.avancar(20 * 60);
    const res = await c.post('/auth/mfa/setup', desafio);
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json<object>()).sort()).toEqual([
      'otpauthUrl',
      'secret',
    ]);
    const novo = res.cookies.find(
      (item) => item.name === MFA_CHALLENGE_COOKIE,
    ) as { value: string; maxAge?: number; httpOnly?: boolean };
    expect(novo.httpOnly).toBe(true);
    expect(novo.maxAge).toBe(1800);
    expect(novo.value).not.toBe(desafio);
    // O desafio antigo teria expirado 10 min depois; o novo ainda vale.
    c.avancar(15 * 60);
    expect((await c.post('/auth/mfa/setup', desafio)).statusCode).toBe(401);
    expect((await c.post('/auth/mfa/setup', novo.value)).statusCode).toBe(200);
  });

  it('login de conta com MFA devolve a tentativa da senha certa', async () => {
    await c.entrar();
    expect(c.attempts.devolvidas).toEqual(['u:7']);
  });

  it('setup com o MFA já ativo responde 409', async () => {
    await c.cadastrar();
    const res = await c.post('/auth/mfa/setup', await c.desafioDe());
    expect(res.statusCode).toBe(409);
  });

  it('verify sem segredo pendente responde 409', async () => {
    const res = await c.post('/auth/mfa/verify', await c.desafioDe(), {
      code: '123456',
    });
    expect(res.statusCode).toBe(409);
  });

  it('código errado não emite sessão e conta como falha no bloqueio da conta', async () => {
    const desafio = await c.desafioDe();
    const { secret } = (await c.post('/auth/mfa/setup', desafio)).json<{
      secret: string;
    }>();
    const certo = c.codigoAtual(secret);
    const errado = certo === '000000' ? '000001' : '000000';
    const res = await c.post('/auth/mfa/verify', desafio, { code: errado });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      message: 'Código inválido.',
      code: 'mfa_code_invalid',
    });
    expect(c.cookieDe(res, 'token')).toBeUndefined();
    // Uma reserva no login e outra no verify; nenhuma sessão emitida, então nada zerado.
    expect(c.attempts.reservas).toEqual(['u:7', 'u:7']);
    expect(c.attempts.zerados).toHaveLength(0);
    expect(c.contas.get(7)!.mfa_enabled_at).toBeNull();
  });

  it('código de recuperação vale uma vez', async () => {
    const { recoveryCodes } = await c.cadastrar();
    const primeira = await c.post('/auth/mfa/verify', await c.desafioDe(), {
      recoveryCode: recoveryCodes[0].toLowerCase().replace('-', ''),
    });
    expect(primeira.statusCode).toBe(200);
    expect(c.cookieDe(primeira, 'token')?.value).toBeTruthy();
    expect(primeira.json()).not.toHaveProperty('recoveryCodes');
    expect(c.contas.get(7)!.mfa_recovery_codes).toHaveLength(7);

    const zeradosAntes = c.attempts.zerados.length;
    const repetida = await c.post('/auth/mfa/verify', await c.desafioDe(), {
      recoveryCode: recoveryCodes[0],
    });
    expect(repetida.statusCode).toBe(401);
    expect(repetida.json()).toMatchObject({ code: 'mfa_code_invalid' });
    expect(c.attempts.zerados).toHaveLength(zeradosAntes);
  });

  it('replay do mesmo passo TOTP é recusado; o passo seguinte entra', async () => {
    const { secret } = await c.cadastrar();
    const desafio = await c.desafioDe();
    const replay = await c.post('/auth/mfa/verify', desafio, {
      code: c.codigoAtual(secret),
    });
    expect(replay.statusCode).toBe(401);
    expect(replay.json()).toMatchObject({ code: 'mfa_code_invalid' });

    c.avancar(30);
    const seguinte = await c.post('/auth/mfa/verify', desafio, {
      code: c.codigoAtual(secret),
    });
    expect(seguinte.statusCode).toBe(200);
    expect(c.cookieDe(seguinte, 'token')?.value).toBeTruthy();
  });

  it('segue sem antirreplay, com aviso, se o Redis falhar', async () => {
    const { secret } = await c.cadastrar();
    c.redis.indisponivel = true;
    const res = await c.post('/auth/mfa/verify', await c.desafioDe(), {
      code: c.codigoAtual(secret),
    });
    expect(res.statusCode).toBe(200);
  });

  it('aluno não é afetado: login idêntico ao atual, com sessão direta', async () => {
    const res = await c.entrar('aluno@example.test');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      message: 'Login realizado com sucesso',
      nome: 'Gestão',
      user: { userId: 8, role: Role.USER },
    });
    expect(c.cookieDe(res, 'token')?.value).toBeTruthy();
    expect(c.cookieDe(res, MFA_CHALLENGE_COOKIE)).toBeUndefined();
  });

  it('sem MFA_ENCRYPTION_KEY o MFA fica desligado e o admin entra como hoje', async () => {
    const desafio = await c.desafioDe();
    delete process.env.MFA_ENCRYPTION_KEY;

    const res = await c.entrar();
    expect(res.json()).not.toHaveProperty('requiresMfa');
    expect(c.cookieDe(res, 'token')?.value).toBeTruthy();
    expect(c.cookieDe(res, MFA_CHALLENGE_COOKIE)).toBeUndefined();

    // Um desafio emitido antes de desligar também deixa de valer.
    const setup = await c.post('/auth/mfa/setup', desafio);
    expect(setup.statusCode).toBe(401);
    expect(setup.json()).toMatchObject({ code: 'mfa_challenge_invalid' });
  });

  it.each([
    ['ausente', undefined],
    ['com 31 caracteres', 'a'.repeat(31)],
  ])(
    'conta de gestão com MFA ativo e chave %s não entra só com a senha: 503',
    async (_caso, chave) => {
      await c.cadastrar();
      const erro = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      if (chave === undefined) delete process.env.MFA_ENCRYPTION_KEY;
      else process.env.MFA_ENCRYPTION_KEY = chave;
      const zeradosAntes = c.attempts.zerados.length;

      const res = await c.entrar();
      expect(res.statusCode).toBe(503);
      expect(res.json()).toMatchObject({
        message: expect.stringContaining('indisponível') as string,
      });
      expect(c.cookieDe(res, 'token')).toBeUndefined();
      expect(c.cookieDe(res, MFA_CHALLENGE_COOKIE)).toBeUndefined();
      expect(c.attempts.zerados).toHaveLength(zeradosAntes);
      expect(erro).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(erro.mock.calls)).not.toContain('gestao@');
      erro.mockRestore();
    },
  );

  it('chave curta com a conta sem MFA ativo ou aluno: login como hoje', async () => {
    process.env.MFA_ENCRYPTION_KEY = 'a'.repeat(31);
    const gestao = await c.entrar();
    expect(gestao.statusCode).toBe(200);
    expect(c.cookieDe(gestao, 'token')?.value).toBeTruthy();
    const aluno = await c.entrar('aluno@example.test');
    expect(aluno.statusCode).toBe(200);
    expect(c.cookieDe(aluno, 'token')?.value).toBeTruthy();
  });

  it('se o setup trocar o segredo entre a validação e a ativação, a conta não é ativada', async () => {
    const desafio = await c.desafioDe();
    const { secret } = (await c.post('/auth/mfa/setup', desafio)).json<{
      secret: string;
    }>();
    // Simula o setup concorrente: o segredo gravado muda depois de o código ser validado.
    const original = c.store.activate.bind(c.store) as (
      id: number,
      hashes: string[],
      usado: string,
    ) => Promise<boolean>;
    jest.spyOn(c.store, 'activate').mockImplementation((id, hashes, usado) => {
      c.contas.get(7)!.mfa_secret_encrypted = 'segredo-trocado-pelo-setup';
      return original(id, hashes, usado);
    });
    const res = await c.post('/auth/mfa/verify', desafio, {
      code: c.codigoAtual(secret),
    });
    expect(res.statusCode).toBe(409);
    expect(c.cookieDe(res, 'token')).toBeUndefined();
    expect(c.contas.get(7)!.mfa_enabled_at).toBeNull();
  });
});
