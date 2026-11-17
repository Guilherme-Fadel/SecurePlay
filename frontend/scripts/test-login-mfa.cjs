// Etapa de MFA do login: mapeamento de `requiresMfa` e classificação de erros, sem runner novo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const isAxiosError = (error) => Boolean(error) && error.isAxiosError === true;
const httpError = (status, data) => ({ isAxiosError: true, response: { status, data } });
const networkError = () => ({ isAxiosError: true, response: undefined });

function loadModule(relative, mocks) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, {
    module, exports: module.exports, Array, Promise, Boolean, String, Object,
    require(name) {
      if (name in mocks) return mocks[name];
      throw new Error(`Import inesperado: ${name}`);
    },
  });
  return module.exports;
}

/** Carrega loginErrors, mfa e login com `api` e `getMe` simulados. */
function setup({ post, getMe } = {}) {
  const calls = [];
  const api = { post: async (url, body) => { calls.push({ url, body }); return post(url, body); } };
  const loginErrors = loadModule('src/services/login/loginErrors.ts', { axios: { isAxiosError } });
  const mfa = loadModule('src/services/login/mfa.ts', { axios: { isAxiosError }, '@/services/api': { api }, './loginErrors': loginErrors });
  const login = loadModule('src/services/login/login.ts', {
    '@/services/api': { api },
    '@/services/me': { getMe: getMe ?? (async () => { throw new Error('getMe não deveria ser chamado'); }) },
    './loginErrors': loginErrors,
  });
  return { calls, mfa, login, loginErrors };
}

test('login devolve a etapa de MFA sem buscar o usuário', async () => {
  const { login, calls } = setup({
    post: async () => ({ data: { requiresMfa: true, mfaSetupRequired: true, message: 'Confirme seu acesso.' } }),
  });
  const outcome = await login.loginService(' gestor@escola.com ', 'senha');
  assert.deepEqual({ ...outcome }, { status: 'mfa', setupRequired: true, message: 'Confirme seu acesso.' });
  assert.deepEqual({ ...calls[0].body }, { identifier: 'gestor@escola.com', password: 'senha' });
});

test('login com MFA já ativo e sem mensagem usa o texto padrão', async () => {
  const { login } = setup({ post: async () => ({ data: { requiresMfa: true, mfaSetupRequired: false } }) });
  const outcome = await login.loginService('gestor', 'senha');
  assert.equal(outcome.status, 'mfa');
  assert.equal(outcome.setupRequired, false);
  assert.match(outcome.message, /app autenticador/);
});

test('mfaSetupRequired só vale quando é exatamente true', async () => {
  const { login } = setup({ post: async () => ({ data: { requiresMfa: true, mfaSetupRequired: 'true' } }) });
  assert.equal((await login.loginService('gestor', 'senha')).setupRequired, false);
});

test('login sem MFA segue buscando o usuário', async () => {
  const user = { userId: 1 };
  const { login } = setup({ post: async () => ({ data: { nome: 'Ana', message: 'ok' } }), getMe: async () => user });
  const outcome = await login.loginService('aluno', 'senha');
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.user, user);
});

test('classificação dos erros do MFA', () => {
  const { mfa } = setup();
  const reason = (error) => mfa.classifyMfaError(error).reason;
  assert.equal(reason(httpError(401, { code: 'mfa_code_invalid', message: 'Code is invalid' })), 'code_invalid');
  assert.equal(reason(httpError(401, { code: 'mfa_challenge_invalid' })), 'challenge_invalid');
  assert.equal(reason(httpError(401, undefined)), 'challenge_invalid');
  assert.equal(reason(httpError(400, { message: ['code must be a string'] })), 'code_invalid');
  assert.equal(reason(httpError(429, {})), 'rate_limited');
  assert.equal(reason(networkError()), 'network');
  assert.equal(reason(httpError(500, {})), 'server');
  assert.equal(reason(new Error('x')), 'server');
});

test('mensagens do MFA são em português e não repetem o texto do backend', () => {
  const { mfa } = setup();
  const failure = mfa.classifyMfaError(httpError(401, { code: 'mfa_code_invalid', message: 'Invalid code (en)' }));
  assert.equal(failure.message, mfa.MFA_ERROR_MESSAGES.code_invalid);
  assert.equal(mfa.MFA_ERROR_MESSAGES.challenge_invalid, 'Sua verificação expirou. Entre de novo.');
  for (const message of Object.values(mfa.MFA_ERROR_MESSAGES)) assert.ok(message.trim().length > 10);
});

test('verifyMfa envia o corpo e devolve os códigos de recuperação', async () => {
  const { mfa, calls } = setup({
    post: async () => ({ data: { message: 'Login realizado', nome: 'Ana', user: {}, recoveryCodes: ['AAAA-1111', '', 7, 'BBBB-2222'] } }),
  });
  const result = await mfa.verifyMfa({ code: '123456' });
  assert.equal(calls[0].url, '/auth/mfa/verify');
  assert.deepEqual({ ...calls[0].body }, { code: '123456' });
  assert.equal(result.status, 'success');
  assert.equal(result.nome, 'Ana');
  assert.deepEqual([...result.recoveryCodes], ['AAAA-1111', 'BBBB-2222']);
});

test('verifyMfa sem recoveryCodes e com erro', async () => {
  let fail = false;
  const { mfa } = setup({
    post: async () => {
      if (fail) throw httpError(429, {});
      return { data: { message: 'ok' } };
    },
  });
  const ok = await mfa.verifyMfa({ recoveryCode: 'ABCD-EFGH' });
  assert.equal(ok.status, 'success');
  assert.deepEqual([...ok.recoveryCodes], []);
  fail = true;
  const failed = await mfa.verifyMfa({ code: '000000' });
  assert.equal(failed.status, 'error');
  assert.equal(failed.reason, 'rate_limited');
});

test('startMfaSetup valida a resposta e trata 409 e desafio expirado', async () => {
  const responses = [
    { data: { secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/SecurePlay:a?secret=JBSWY3DPEHPK3PXP' } },
    { data: { secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'https://evil.example/x' } },
    httpError(409, { message: 'já ativo' }),
    httpError(401, { code: 'mfa_challenge_invalid', message: 'x' }),
  ];
  const { mfa } = setup({
    post: async () => {
      const next = responses.shift();
      if (next.isAxiosError) throw next;
      return next;
    },
  });
  const ok = await mfa.startMfaSetup();
  assert.equal(ok.status, 'success');
  assert.equal(ok.secret, 'JBSWY3DPEHPK3PXP');
  assert.equal((await mfa.startMfaSetup()).reason, 'server');
  const active = await mfa.startMfaSetup();
  assert.equal(active.alreadyActive, true);
  assert.equal((await mfa.startMfaSetup()).reason, 'challenge_invalid');
});

test('groupSecret separa a chave em blocos de 4 caracteres', () => {
  const { mfa } = setup();
  assert.deepEqual([...mfa.groupSecret('JBSWY3DPEHPK3PXP')], ['JBSW', 'Y3DP', 'EHPK', '3PXP']);
  assert.deepEqual([...mfa.groupSecret('ABCDEF GHI')], ['ABCD', 'EFGH', 'I']);
  assert.deepEqual([...mfa.groupSecret('')], []);
});
