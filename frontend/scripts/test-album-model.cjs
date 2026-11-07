const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

const model = load('src/components/sections/HomePage/Awards/albumModel.ts', {});
const plain = (value) => JSON.parse(JSON.stringify(value));
/** O módulo roda em outro contexto do vm: compara a forma, não o protótipo. */
const same = (actual, expected) => assert.deepEqual(plain(actual), expected);

let id = 0;
/** Nó no formato de `GET /achievements` (achievement-trail.mapper.ts). */
function node(category, tier, overrides = {}) {
  id += 1;
  return {
    id, slug: `${category}-${tier}`, name: `${category} ${tier}`, description: `Descrição ${category} ${tier}`,
    category, rarity: 'common', tier, icon: 'shield', iconName: 'shield', artworkUrl: null,
    rewardPrestige: tier, prerequisiteSlug: tier > 1 ? `${category}-${tier - 1}` : null,
    position: { x: 0, y: 0 }, progress: 0, target: 10, progressPercent: 0,
    status: 'locked', unlockedAt: null, secret: false, ...overrides,
  };
}

/** Secreta ainda não desbloqueada, exatamente como o mapper mascara. */
function concealed(category, tier, status = 'locked') {
  return node(category, tier, {
    name: 'Conquista secreta', description: 'Continue avançando para revelar esta conquista.',
    icon: 'lock-keyhole', iconName: 'lock-keyhole', rewardPrestige: null, progress: 0, target: null,
    progressPercent: 0, status, secret: true,
  });
}

function catalog() {
  return [
    node('sentinel', 1, { status: 'unlocked', progress: 1, target: 1, progressPercent: 100, unlockedAt: '2026-10-02T12:00:00' }),
    node('sentinel', 2, { status: 'in_progress', progress: 2, target: 3, progressPercent: 67 }),
    node('sentinel', 3, { progress: 2, target: 10, progressPercent: 20 }),
    concealed('sentinel', 4),
    node('specialist', 1, { status: 'in_progress', progress: 0, target: 1, progressPercent: 0 }),
    node('specialist', 2, { progress: 0, target: 5 }),
    node('investigator', 1, { status: 'unlocked', progress: 1, target: 1, progressPercent: 100 }),
    node('investigator', 2, { status: 'in_progress', progress: 9, target: 10, progressPercent: 90 }),
    node('consistency', 1, { status: 'unlocked', progress: 1, target: 1, progressPercent: 100 }),
    node('consistency', 2, { status: 'unlocked', progress: 3, target: 3, progressPercent: 100 }),
    node('consistency', 3, { status: 'unlocked', progress: 7, target: 7, progressPercent: 100 }),
    node('consistency', 4, { status: 'unlocked', progress: 30, target: 30, progressPercent: 100, secret: true, name: 'Disciplina' }),
    node('elite', 1, { status: 'in_progress', progress: 1, target: 2, progressPercent: 50 }),
    concealed('elite', 4, 'in_progress'),
  ];
}

test('estados: colada, próxima, bloqueada e segredo vêm do status e do mascaramento do backend', () => {
  const album = model.buildAlbum(catalog());
  const states = Object.fromEntries(album.stickers.map((sticker) => [sticker.node.slug, sticker.state]));
  assert.equal(states['sentinel-1'], 'stuck');
  assert.equal(states['sentinel-2'], 'next');
  assert.equal(states['sentinel-3'], 'locked');
  assert.equal(states['sentinel-4'], 'secret');
  // Secreta já desbloqueada é revelada pelo backend e conta como colada.
  assert.equal(states['consistency-4'], 'stuck');
  // Secreta com pré-requisito cumprido continua mascarada: não vira "próxima".
  assert.equal(states['elite-4'], 'secret');
});

test('coleções na ordem do backend, numeração contínua e contagens x/total', () => {
  const album = model.buildAlbum(catalog());
  same(album.collections.map((c) => [c.category, c.label, c.stuck, c.total, c.complete]), [
    ['sentinel', 'Sentinela', 1, 4, false],
    ['specialist', 'Especialista', 0, 2, false],
    ['investigator', 'Investigador', 1, 2, false],
    ['consistency', 'Consistência', 4, 4, true],
    ['elite', 'Elite', 0, 2, false],
  ]);
  assert.equal(album.stuck, 6);
  assert.equal(album.total, 14);
  same(album.stickers.map((s) => s.number), Array.from({ length: 14 }, (_, i) => i + 1));
  assert.equal(model.collectionRange(album.collections[0]), '#01–#04');
  assert.equal(model.collectionRange(album.collections[1]), '#05–#06');
  assert.equal(model.collectionNextText(album.collections[0]), 'sentinel 2 · falta 1');
  assert.equal(model.collectionNextText(album.collections[3]), 'Coleção completa');
  assert.equal(model.collectionNextText(album.collections[4]), 'elite 1 · falta 1');
});

test('ordena por nível dentro da coleção e aceita categoria desconhecida sem quebrar', () => {
  const album = model.buildAlbum([node('nova', 2), node('nova', 1), node('sentinel', 1)]);
  same(album.collections[0].stickers.map((s) => s.node.tier), [1, 2]);
  assert.equal(album.collections[0].label, 'Nova');
  assert.equal(model.destinationFor('nova', { games: true, dailyMission: true }), null);
});

test('"Quase lá!" usa as próximas com meta, da maior porcentagem para a menor, sem secretas', () => {
  const album = model.buildAlbum(catalog());
  same(model.almostThere(album).map((s) => [s.node.slug, s.percent]), [
    ['investigator-2', 90], ['sentinel-2', 67], ['elite-1', 50], ['specialist-1', 0],
  ]);
  const empate = model.buildAlbum([
    node('a', 1, { status: 'in_progress', progress: 5, target: 10, progressPercent: 50 }),
    node('b', 1, { status: 'in_progress', progress: 1, target: 2, progressPercent: 50 }),
  ]);
  same(model.almostThere(empate).map((s) => s.node.slug), ['b-1', 'a-1']);
  same(model.almostThere(model.buildAlbum([])), []);
});

test('filtros: todas, coladas, próximas e bloqueadas (bloqueadas incluem secretas)', () => {
  const sentinel = model.buildAlbum(catalog()).collections[0];
  same(model.filterCounts(sentinel.stickers), { all: 4, stuck: 1, next: 1, locked: 2 });
  same(model.filterStickers(sentinel.stickers, 'locked').map((s) => s.state), ['locked', 'secret']);
  same(model.filterStickers(sentinel.stickers, 'next').map((s) => s.node.slug), ['sentinel-2']);
});

test('destinos D17: cada coleção leva à tela que conta o progresso; seção indisponível, sem botão', () => {
  const all = { games: true, dailyMission: true };
  const dest = (category, features = all) => plain(model.destinationFor(category, features));
  same(dest('sentinel'), { section: 'dashboard', label: 'Ir para a missão do dia' });
  same(dest('consistency'), { section: 'dashboard', label: 'Fazer o check-in no Início' });
  same(dest('specialist'), { section: 'conteudos', label: 'Ir para Aprender' });
  same(dest('investigator'), { section: 'desafios', label: 'Ir para Jogos' });
  same(dest('elite'), { section: 'conteudos', label: 'Ganhar XP em Aprender' });
  assert.equal(dest('investigator', { games: false, dailyMission: true }), null);
  assert.equal(dest('sentinel', { games: true, dailyMission: false }), null);
  assert.equal(dest('consistency', { games: true, dailyMission: false }), null);

  const album = model.buildAlbum(catalog());
  const bySlug = (slug) => album.stickers.find((s) => s.node.slug === slug);
  assert.equal(model.stickerDestination(bySlug('sentinel-2'), all).section, 'dashboard');
  // Colada, bloqueada e segredo não ganham botão.
  for (const slug of ['sentinel-1', 'sentinel-3', 'sentinel-4']) assert.equal(model.stickerDestination(bySlug(slug), all), null);
});

test('textos do detalhe não revelam secretas e usam progresso/recompensa do backend', () => {
  const album = model.buildAlbum(catalog());
  const bySlug = (slug) => album.stickers.find((s) => s.node.slug === slug);
  const secret = bySlug('sentinel-4');
  assert.equal(model.stickerLabel(secret), 'Segredo');
  // Rótulo fixo: a descrição mascarada já aparece no detalhe e não se repete.
  assert.equal(model.statusText(secret, album), 'Figurinha secreta');
  assert.equal(model.rewardText(secret), 'Recompensa secreta');
  assert.equal(model.progressText(secret), '');
  assert.equal(model.stickerAria(secret), '#04 Conquista secreta, segredo');

  assert.equal(model.statusText(bySlug('sentinel-1'), album), 'Colada em 02/10');
  assert.equal(model.rewardText(bySlug('sentinel-1')), 'Você ganhou 1 Chave Digital');
  assert.equal(model.statusText(bySlug('sentinel-2'), album), 'Falta 1 para colar');
  assert.equal(model.rewardText(bySlug('sentinel-2')), 'Vale 2 Chaves Digitais');
  assert.equal(model.statusText(bySlug('sentinel-3'), album), 'Cole antes a #02 · sentinel 2');
  assert.equal(model.stickerAria(bySlug('sentinel-2')), '#02 sentinel 2, próxima, 2 de 3');
  assert.equal(model.statusText(bySlug('consistency-2'), album), 'Colada');
});

test('leque: até 3 coladas mais a próxima; sem nenhuma, a primeira em silhueta e nunca a secreta', () => {
  const album = model.buildAlbum(catalog());
  const kinds = (collection) => model.collectionFan(collection).map((f) => [f.sticker.node.slug, f.kind]);
  same(kinds(album.collections[0]), [['sentinel-1', 'stuck'], ['sentinel-2', 'ghost']]);
  same(kinds(album.collections[3]), [['consistency-2', 'stuck'], ['consistency-3', 'stuck'], ['consistency-4', 'stuck']]);
  const locked = model.buildAlbum([concealed('x', 1), node('x', 2)]);
  same(kinds(locked.collections[0]), [['x-2', 'silhouette']]);
});
