const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

const model = load('src/components/sections/HomePage/Awards/collectiblesModel.ts', {
  './albumModel': load('src/components/sections/HomePage/Awards/albumModel.ts', {}),
});
const plain = (value) => JSON.parse(JSON.stringify(value));

const item = (id, type, extra = {}) => ({
  id, slug: `item-${id}`, name: `Item ${id}`, description: '', type, rarity: 'common', price: 5,
  visualValue: `${type}-${id}`, requiredAchievementSlug: null,
  requirementMet: true, owned: false, equipped: false, affordable: true, ...extra,
});

const node = (id, extra = {}) => ({
  id, slug: `ach-${id}`, name: `Conquista ${id}`, description: `Dica ${id}`, category: 'elite', rarity: 'common', tier: 1,
  icon: 'x', iconName: 'x', artworkUrl: null, rewardPrestige: 2, prerequisiteSlug: null, position: { x: 0, y: 0 },
  progress: 0, target: 10, progressPercent: 0, status: 'in_progress', unlockedAt: null, secret: false, ...extra,
});

test('estado do item segue as flags do backend, com prioridade equipado > seu > bloqueado > faltam > comprar', () => {
  assert.equal(model.itemState(item(1, 'frame')), 'buy');
  assert.equal(model.itemState(item(1, 'frame', { affordable: false })), 'save');
  assert.equal(model.itemState(item(1, 'frame', { requirementMet: false, affordable: false })), 'lock');
  assert.equal(model.itemState(item(1, 'frame', { requirementMet: false, affordable: true })), 'lock');
  assert.equal(model.itemState(item(1, 'frame', { owned: true, affordable: false, requirementMet: false })), 'own');
  assert.equal(model.itemState(item(1, 'frame', { owned: true, equipped: true })), 'equipped');
});

test('faltam chaves só exibe a diferença; se o saldo recebido não explica a recusa, não inventa número', () => {
  assert.equal(model.missingLabel(7, 4), 'Faltam 3 chaves');
  assert.equal(model.missingLabel(5, 4), 'Faltam 1 chave');
  assert.equal(model.missingKeys(5, 5), null);
  assert.equal(model.missingLabel(5, 9), 'Chaves insuficientes');
  assert.equal(model.keysLabel(0), '0 chaves');
  assert.deepEqual(plain(model.keySegments(5, 2)), [true, true, false, false, false]);
  assert.deepEqual(plain(model.keySegments(3, 0)), [false, false, false]);
  assert.equal(model.keySegments(50, 3, 20).length, 20);
});

test('abas: os cinco tipos do backend na ordem fixa, com contagem (inclusive zero)', () => {
  const items = [item(1, 'frame'), item(2, 'frame'), item(3, 'title'), item(4, 'effect')];
  assert.deepEqual(plain(model.tabCounts(items)), [
    { type: 'frame', label: 'Bordas', count: 2 },
    { type: 'background', label: 'Fundos', count: 0 },
    { type: 'title', label: 'Títulos', count: 1 },
    { type: 'badge', label: 'Emblemas', count: 0 },
    { type: 'effect', label: 'Efeitos', count: 1 },
  ]);
  assert.equal(model.initialTab([item(9, 'badge')]), 'badge');
  assert.equal(model.initialTab([]), 'frame');
  assert.deepEqual(plain(model.itemsOfType(items, 'frame').map((it) => it.id)), [1, 2]);
});

test('setas das abas são circulares e Home/End vão às pontas', () => {
  assert.equal(model.tabIndexAfterKey('ArrowRight', 4, 5), 0);
  assert.equal(model.tabIndexAfterKey('ArrowLeft', 0, 5), 4);
  assert.equal(model.tabIndexAfterKey('Home', 3, 5), 0);
  assert.equal(model.tabIndexAfterKey('End', 0, 5), 4);
  assert.equal(model.tabIndexAfterKey('Enter', 0, 5), null);
});

test('provador: equipado do backend com a prévia por cima só no tipo dela', () => {
  const items = [item(1, 'frame', { owned: true, equipped: true, name: 'Moldura A' }), item(2, 'frame', { name: 'Moldura B' }), item(3, 'background', { owned: true, equipped: true })];
  const shop = { equipped: [{ type: 'frame', slug: 'item-1', visualValue: 'frame-1' }, { type: 'background', slug: 'item-3', visualValue: 'background-3' }], items };
  const worn = model.buildLook(shop, null);
  assert.equal(worn.frame.name, 'Moldura A');
  assert.equal(worn.frame.preview, false);
  assert.equal(worn.title, null);
  const tried = model.buildLook(shop, items[1]);
  assert.deepEqual(plain(tried.frame), { type: 'frame', slug: 'item-2', name: 'Moldura B', visualValue: 'frame-2', preview: true });
  assert.equal(tried.background.visualValue, 'background-3');
});

test('requisito vem da trilha pelo slug; sem trilha não revela o slug (pode ser de uma secreta)', () => {
  const trail = { nodes: [node(1, { slug: 'sentinela-veterano', name: 'Sentinela veterano', description: 'Conclua 10 desafios.' })] };
  assert.equal(model.requirementInfo({ requiredAchievementSlug: 'sentinela-veterano' }, trail).name, 'Sentinela veterano');
  const withoutTrail = model.requirementInfo({ requiredAchievementSlug: 'investigador-lendario' }, null).name;
  assert.equal(withoutTrail, 'uma conquista do álbum');
  assert.doesNotMatch(withoutTrail, /investigador|lendario/i);
  assert.equal(model.requirementInfo({ requiredAchievementSlug: null }, trail), null);
});

test('como ganhar chaves: só em progresso, com recompensa e não secretas; mais adiantadas primeiro', () => {
  const trail = { nodes: [
    node(1, { progressPercent: 40, progress: 4 }),
    node(2, { progressPercent: 80, progress: 8 }),
    node(3, { status: 'unlocked', progressPercent: 100 }),
    node(4, { status: 'locked', progressPercent: 0 }),
    node(5, { rewardPrestige: null, target: null, progressPercent: 0 }),
    node(6, { progressPercent: 40, rewardPrestige: 5 }),
  ] };
  const near = model.nearKeyAchievements(trail, 2);
  assert.equal(near.total, 3);
  assert.deepEqual(plain(near.items.map((entry) => entry.node.id)), [2, 6]);
  assert.equal(near.items[0].progressLabel, '8 de 10');
  assert.equal(near.items[0].reward, 2);
  assert.deepEqual(plain(model.nearKeyAchievements(null)), { items: [], total: 0 });
});

test('rótulo acessível do item descreve o estado', () => {
  assert.equal(model.itemAriaLabel(item(1, 'frame', { affordable: false, price: 7 }), 4, null), 'Item 1, Borda, custa 7 chaves, faltam 3 chaves. Experimentar no provador');
  assert.equal(model.itemAriaLabel(item(1, 'title', { requirementMet: false }), 4, { name: 'Aprendiz dedicado', hint: null, node: null }), 'Item 1, Título, precisa da conquista Aprendiz dedicado. Experimentar no provador');
  assert.match(model.itemAriaLabel(item(1, 'badge', { owned: true, equipped: true }), 0, null), /equipado/);
});

test('mensagem de erro do backend com string ou lista; formatos estranhos caem no texto padrão', () => {
  assert.equal(model.extractErrorMessage({ response: { data: { message: 'Chaves Digitais insuficientes' } } }), 'Chaves Digitais insuficientes');
  assert.equal(model.extractErrorMessage({ response: { data: { message: ['', 'Primeira'] } } }), 'Primeira');
  assert.equal(model.extractErrorMessage(new Error('rede')), undefined);
  assert.equal(model.extractErrorMessage(null), undefined);
  assert.equal(model.extractErrorMessage({ response: { data: { message: 42 } } }), undefined);
});
