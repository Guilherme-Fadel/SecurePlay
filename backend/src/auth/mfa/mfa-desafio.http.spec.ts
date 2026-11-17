import { Role } from '../roles.enum';
import { CenarioMfa, criarCenarioMfa } from './mfa-http-fixture';

describe('HTTP: isolamento e validade do desafio de MFA', () => {
  let c: CenarioMfa;

  beforeEach(async () => {
    c = await criarCenarioMfa();
  });

  afterEach(async () => {
    await c.encerrar();
  });

  describe('o desafio não serve como sessão', () => {
    it('é recusado no cookie token e no cabeçalho Authorization', async () => {
      const desafio = await c.desafioDe();
      const comCookie = await c.app.inject({
        method: 'GET',
        url: '/sonda/protegida',
        headers: { cookie: `token=${desafio}` },
      });
      expect(comCookie.statusCode).toBe(401);
      const comCabecalho = await c.app.inject({
        method: 'GET',
        url: '/sonda/protegida',
        headers: { authorization: `Bearer ${desafio}` },
      });
      expect(comCabecalho.statusCode).toBe(401);
    });

    it('é recusado mesmo assinado com a chave da sessão, por causa do purpose', async () => {
      const assinadoComChaveDaSessao = c.jwt.sign({
        sub: 7,
        email: 'gestao@example.test',
        role: Role.ADMIN,
        purpose: 'mfa',
        sessionVersion: 0,
      });
      const res = await c.app.inject({
        method: 'GET',
        url: '/sonda/protegida',
        headers: { authorization: `Bearer ${assinadoComChaveDaSessao}` },
      });
      expect(res.statusCode).toBe(401);
    });

    it('a sessão também não serve como desafio', async () => {
      const sessao = c.jwt.sign({ sub: 7, sessionVersion: 0, purpose: 'mfa' });
      const res = await c.post('/auth/mfa/setup', sessao);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ code: 'mfa_challenge_invalid' });
    });
  });

  describe('desafio inválido', () => {
    const corpoInvalido = {
      message: 'Sua verificação expirou. Entre de novo.',
      code: 'mfa_challenge_invalid',
    };

    it('ausente', async () => {
      const res = await c.post('/auth/mfa/verify', undefined, {
        code: '123456',
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject(corpoInvalido);
    });

    it('adulterado', async () => {
      const res = await c.post('/auth/mfa/setup', `${await c.desafioDe()}x`);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject(corpoInvalido);
    });

    it('expirado (5 minutos)', async () => {
      const desafio = await c.desafioDe();
      c.avancar(5 * 60 + 5);
      const res = await c.post('/auth/mfa/setup', desafio);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject(corpoInvalido);
    });

    it('com sessionVersion antigo', async () => {
      const desafio = await c.desafioDe();
      c.contas.get(7)!.session_version = 1;
      const res = await c.post('/auth/mfa/setup', desafio);
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject(corpoInvalido);
    });

    it('de conta desativada', async () => {
      const desafio = await c.desafioDe();
      c.contas.get(7)!.active = false;
      const res = await c.post('/auth/mfa/setup', desafio);
      expect(res.statusCode).toBe(401);
    });
  });

  it('exige exatamente um entre code e recoveryCode', async () => {
    const desafio = await c.desafioDe();
    expect((await c.post('/auth/mfa/verify', desafio, {})).statusCode).toBe(
      400,
    );
    const ambos = await c.post('/auth/mfa/verify', desafio, {
      code: '123456',
      recoveryCode: 'ABCD-EFGH',
    });
    expect(ambos.statusCode).toBe(400);
    const curto = await c.post('/auth/mfa/verify', desafio, { code: '12' });
    expect(curto.statusCode).toBe(400);
    expect(c.attempts.falhas).toHaveLength(0);
  });
});
