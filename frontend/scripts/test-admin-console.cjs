const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const modules = new Map();
let rejectMutation = false;
const api = { get: async () => ({ data: [] }), post: async () => { if (rejectMutation) throw new Error('Falha simulada'); return { data: {} }; }, put: async () => { if (rejectMutation) throw new Error('Falha simulada'); return { data: {} }; } };
function load(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, Date, Map, Set, require: (name) => {
    if (name === '@/services/api' || name === './api') return { api };
    if (name === '@/lib/adminCache') return load('src/lib/adminCache.ts');
    if (name === './queryCache') return load('src/lib/queryCache.ts');
    throw new Error(`Import inesperado: ${name}`);
  } });
  modules.set(relative, module.exports);
  return module.exports;
}

async function main() {
  const { resolveConsolePage } = load('src/components/admin/console/consoleNavigation.ts');
  const cache = load('src/lib/queryCache.ts');
  const { adminQueryKey } = load('src/lib/adminCache.ts');
  const { companyCacheKey } = load('src/config/features.ts');
  const service = load('src/services/admin.ts');
  const people = load('src/services/convites.ts');
  for (const [suffix, id] of [['auditoria/configuracoes', 'audit-settings'], ['auditoria/eventos', 'audit-events'], ['configuracoes/dados', 'data'], ['configuracoes/aparencia', 'appearance'], ['configuracoes/funcionalidades', 'features'], ['pessoas/usuarios', 'users'], ['operacao/pilotos/7/editar', 'edit-pilot']]) {
    assert.equal(resolveConsolePage(`/admin/empresas/10/${suffix}`).id, id);
  }
  assert.equal(resolveConsolePage('/admin/empresas/10/qualquer/configuracoes').id, 'unavailable');
  assert.equal(resolveConsolePage('/admin/pessoas/usuarios').list, true);
  const user = { userId: 1, role: 'platform_admin', empresa_id: null, empresa_parametros: {} };
  const key = (resource, company, filters, session = user) => companyCacheKey(adminQueryKey(resource, company, filters), session);
  const first = key('users', 10, { page: 1 });
  const secondPage = key('users', 10, { page: 2 });
  const otherCompany = key('users', 20, { page: 1 });
  const otherSession = key('users', 10, { page: 1 }, { ...user, userId: 2 });
  assert.notEqual(first, otherCompany);
  assert.notEqual(first, otherSession);
  cache.setCache(first, 'original');
  assert.equal(cache.getCached(otherSession), null);
  let calls = 0;
  let resolveOld;
  cache.clearQueryCache();
  const old = cache.fetchCached(first, () => { calls++; return new Promise((resolve) => { resolveOld = resolve; }); });
  const duplicate = cache.fetchCached(first, () => { calls++; return Promise.resolve('duplicate'); });
  assert.equal(calls, 1);
  assert.equal(old, duplicate);
  cache.setCache(secondPage, 'second-page');
  cache.setCache(otherCompany, 'other-company');
  cache.invalidatePrefix(adminQueryKey('users', 10));
  assert.equal(cache.getCached(secondPage), null);
  assert.equal(cache.getCached(otherCompany), 'other-company');
  await cache.fetchCached(first, async () => 'updated');
  resolveOld('obsolete');
  await old;
  assert.equal(cache.getCached(first), 'updated');
  assert.equal(cache.isStale(first), false);
  cache.setCache(key('summary', 10), 'summary');
  cache.setCache(key('audit-events', 10), 'events');
  await people.inativarUsuario(7, 'Motivo fictício', 10);
  assert.equal(cache.getCached(first), null);
  assert.equal(cache.getCached(key('summary', 10)), null);
  assert.equal(cache.getCached(key('audit-events', 10)), null);
  assert.equal(cache.getCached(otherCompany), 'other-company');
  const theme = key('theme', 10);
  cache.setCache(theme, 'theme');
  cache.setCache(key('audit-settings', 10), 'history');
  cache.setCache(key('companies'), 'companies');
  await service.updateTema({ logo_url: null }, 10);
  assert.equal(cache.getCached(theme), null);
  assert.equal(cache.getCached(key('audit-settings', 10)), null);
  assert.equal(cache.getCached(key('companies')), null);
  cache.setCache(theme, 'preserved');
  rejectMutation = true;
  await assert.rejects(service.updateTema({ logo_url: null }, 10));
  assert.equal(cache.getCached(theme), 'preserved');
  cache.clearQueryCache();
  assert.equal(cache.getCached(otherCompany), null);
  console.log('Rotas exatas, separação por sessão/empresa, deduplicação, resposta tardia e invalidação após mutações aprovadas.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
