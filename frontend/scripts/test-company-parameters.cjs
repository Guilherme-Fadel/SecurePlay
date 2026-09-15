const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, Date, Map, Set });
  return module.exports;
}

async function main() {
  const { companyFeaturesForUser, companySessionKey, companyCacheKey } = loadSource('src/config/features.ts');
  const cache = loadSource('src/lib/queryCache.ts');
  const first = { userId: 1, empresa_id: 10, empresa_parametros: { rankingEnabled: true, globalRankingEnabled: false, achievementsEnabled: false, enabledGames: ['quiz-relampago'] } };
  const second = { userId: 2, empresa_id: 20, empresa_parametros: { rankingEnabled: false, globalRankingEnabled: true, achievementsEnabled: true, enabledGames: ['termotech'] } };
  assert.equal(companyFeaturesForUser(first).achievements, false);
  assert.equal(companyFeaturesForUser(second).achievements, true);
  assert.equal(companyFeaturesForUser(second).globalRanking, false);
  assert.equal(companyFeaturesForUser(null).ranking, false);
  assert.equal(companyFeaturesForUser({ ...second, empresa_id: null }).achievements, false);
  const master = { ...first, role: 'platform_admin', empresa_id: null };
  const allFeatures = JSON.stringify({ ranking: true, globalRanking: true, achievements: true, games: ['quiz-relampago', 'caca-phishing', 'classificacao-dados', 'termotech'] });
  assert.equal(JSON.stringify(companyFeaturesForUser(master)), allFeatures);
  assert.equal(JSON.stringify(companyFeaturesForUser({ ...master, empresa_id: 10 })), allFeatures);
  assert.notEqual(companySessionKey(first), companySessionKey({ ...first, role: 'platform_admin' }));
  assert.equal(master.empresa_parametros.achievementsEnabled, false);
  assert.notEqual(companySessionKey(first), companySessionKey(second));
  assert.notEqual(companySessionKey(first), companySessionKey({ ...first, empresa_parametros: second.empresa_parametros }));
  const firstKey = companyCacheKey('achievementShop', first);
  const secondKey = companyCacheKey('achievementShop', second);
  cache.setCache(firstKey, 'company-one');
  assert.equal(cache.getCached(secondKey), null);
  cache.setCache(secondKey, 'company-two');
  cache.invalidate('achievementShop');
  assert.equal(cache.getCached(firstKey), null);
  assert.equal(cache.getCached(secondKey), null);
  let resolveOld;
  const oldRequest = cache.fetchCached(firstKey, () => new Promise((resolve) => { resolveOld = resolve; }));
  cache.clearQueryCache();
  resolveOld('obsolete-permission-context');
  await oldRequest;
  assert.equal(cache.getCached(firstKey), null);
  console.log('15 verificações de parâmetros e isolamento de cache aprovadas.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
