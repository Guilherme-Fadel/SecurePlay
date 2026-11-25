const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

const look = load('src/components/shared/Character/characterLook.ts', {});
const collectibles = load('src/components/sections/HomePage/Awards/collectiblesModel.ts', {
  './albumModel': load('src/components/sections/HomePage/Awards/albumModel.ts', {}),
});
const model = load('src/components/sections/HomePage/Awards/characterModel.ts', {
  './collectiblesModel': collectibles,
  '@/components/shared/Character/characterLook': look,
});
const plain = (value) => JSON.parse(JSON.stringify(value));

const unlock = (met = true, conditions = [], extra = {}) => ({ met, mode: 'all', conditions, ...extra });
const item = (id, type, extra = {}) => ({
  id, slug: `item-${id}`, name: `Item ${id}`, description: '', type, rarity: 'common', price: 50,
  visualValue: `${type}-${id}`, artUrl: null, adjust: { x: 0, y: 0, scale: 1 }, layer: 'front', recolorable: false, festiveEvent: null, availableUntil: null,
  requiredAchievementSlug: null, requirementMet: true, owned: false, equipped: false, color: null,
  affordable: true, unlock: unlock(), ...extra,
});
const equippedPiece = (type, slug, extra = {}) => ({
  type, slug, visualValue: `${type}-v`, artUrl: null, color: null, adjust: { x: 1, y: 2, scale: 1.5 }, layer: 'back', ...extra,
});
const condition = (metric, current, target, extra = {}) => ({ metric, label: 'x', current, target, met: false, ...extra });

test('XP, dias e sequência: rótulo e progresso "N de M"', () => {
  assert.equal(model.conditionLine(condition('xp_season', 40, 100)).text, 'XP na temporada: 40 de 100');
  assert.equal(model.conditionLine(condition('xp_total', 0, 1200)).text, 'XP total: 0 de 1.200');
  assert.equal(model.conditionLine(condition('access_days', 12, 30)).text, 'Dias de acesso: 12 de 30');
  assert.equal(model.conditionLine(condition('streak', 3, 5)).text, 'Sequência de acesso: 3 de 5 dias');
  const done = model.conditionLine(condition('xp_season', 130, 100, { met: true }));
  assert.equal(done.text, 'XP na temporada: 100 de 100');
  assert.equal(done.met, true);
});

test('colocação: escopo vira "da escola" ou "geral" e sem posição diz "sem colocação ainda"', () => {
  const none = model.conditionLine(condition('rank', 0, 10, { scope: 'empresa' }));
  assert.equal(none.label, 'Top 10 da escola');
  assert.equal(none.progress, 'sem colocação ainda');
  assert.equal(none.met, false);
  const ranked = model.conditionLine(condition('rank', 4, 10, { scope: 'empresa', met: true }));
  assert.equal(ranked.progress, 'você está em 4º');
  assert.equal(ranked.met, true);
  assert.equal(model.conditionLine(condition('rank', 7, 3, { scope: 'global' })).label, 'Top 3 geral');
  assert.equal(model.conditionLine(condition('rank', 0, 1, { scope: 'global' })).label, '1º lugar geral');
  // Sem escopo (dado antigo em cache), o texto não inventa "escola" nem "geral".
  assert.equal(model.conditionLine(condition('rank', 0, 10)).label, 'Top 10 da temporada');
});

test('conquista: usa o nome da trilha; sem ela não revela o identificador', () => {
  const nodes = [{ slug: 'mestre-da-temporada', name: 'Mestre da temporada' }];
  const named = model.conditionLine(condition('achievement', false, 'mestre-da-temporada'), nodes);
  assert.equal(named.text, 'Conquista Mestre da temporada: ainda bloqueada');
  const unlocked = model.conditionLine(condition('achievement', true, 'mestre-da-temporada', { met: true }), nodes);
  assert.equal(unlocked.progress, 'desbloqueada');
  const hidden = model.conditionLine(condition('achievement', false, 'segredo-final'), nodes);
  assert.equal(hidden.label, 'Conquista do álbum');
  assert.doesNotMatch(hidden.text, /segredo/);
});

test('modo "todas": uma lista só, com o rótulo; com uma exigência não há rótulo', () => {
  const two = [condition('xp_total', 1, 2), condition('streak', 1, 2)];
  const all = model.unlockSections(unlock(false, two, { mode: 'all' }), null);
  assert.equal(all.modeLabel, 'Cumpra todas');
  assert.deepEqual(plain(all.main.map((line) => line.text)), ['XP total: 1 de 2', 'Sequência de acesso: 1 de 2 dias']);
  assert.deepEqual(plain(all.alsoRequired), []);
  assert.equal(model.unlockSections(unlock(false, [two[0]], { mode: 'all' }), null).modeLabel, null);
  assert.equal(model.unlockSections(unlock(true, []), null).main.length, 0);
});

test('modo "qualquer uma" com conquista obrigatória: a obrigatória aparece à parte ("e também")', () => {
  const nodes = [{ slug: 'mestre-da-temporada', name: 'Mestre da temporada' }];
  const conditions = [
    condition('xp_season', 40, 100),
    condition('rank', 0, 10, { scope: 'empresa' }),
    condition('achievement', false, 'mestre-da-temporada', { required: true }),
  ];
  const view = model.unlockSections(unlock(false, conditions, { mode: 'any' }), { nodes });
  assert.equal(view.modeLabel, 'Cumpra qualquer uma');
  assert.deepEqual(plain(view.main.map((line) => line.label)), ['XP na temporada', 'Top 10 da escola']);
  assert.deepEqual(plain(view.alsoRequired.map((line) => line.label)), ['Conquista Mestre da temporada']);
  // Só uma condição restante no grupo principal: "qualquer uma" não faz sentido.
  const single = model.unlockSections(unlock(false, [conditions[0], conditions[2]], { mode: 'any' }), { nodes });
  assert.equal(single.modeLabel, null);
  assert.equal(single.alsoRequired.length, 1);
  // No modo "todas", a conquista legada entra junto com as demais.
  const together = model.unlockSections(unlock(false, conditions, { mode: 'all' }), { nodes });
  assert.equal(together.main.length, 3);
  assert.equal(together.alsoRequired.length, 0);
});

test('colocação: o rótulo segue o escopo enviado pelo backend', () => {
  assert.equal(model.conditionLine(condition('rank', 0, 10, { scope: 'empresa' })).label, 'Top 10 da escola');
  assert.equal(model.conditionLine(condition('rank', 0, 10, { scope: 'global' })).label, 'Top 10 geral');
});

test('agrupamento por encaixe: coleção e à venda, sem peça de kit não comprada', () => {
  const shop = {
    items: [
      item(1, 'head', { owned: true }),
      item(2, 'head'),
      item(3, 'head', { owned: true, equipped: true }),
      item(4, 'neck'),
      item(5, 'frame', { owned: true }),
      item(6, 'head'),
      item(7, 'head', { owned: true }),
    ],
    kits: [{ id: 1, pieces: [{ id: 6, type: 'head' }, { id: 7, type: 'head' }] }],
  };
  const head = model.slotGroups(shop, 'head');
  // Equipado primeiro; a peça 6 é de kit e não foi comprada; a 7 é de kit e já é do aluno.
  assert.deepEqual(plain(head.collection.map((entry) => entry.id)), [3, 1, 7]);
  assert.deepEqual(plain(head.forSale.map((entry) => entry.id)), [2]);
  assert.deepEqual(plain(model.slotGroups(shop, 'neck').forSale.map((entry) => entry.id)), [4]);
  assert.deepEqual(plain(model.slotGroups(shop, 'skin')), { collection: [], forSale: [] });
  const counts = model.slotCounts(shop);
  assert.deepEqual(plain(counts.map((entry) => [entry.slot, entry.label, entry.count])), [
    ['skin', 'Skin', 0], ['head', 'Cabeça', 4], ['face', 'Rosto', 0], ['neck', 'Pescoço', 1],
    ['effect', 'Efeito', 0], ['background', 'Fundo', 0], ['card', 'Tema do card', 0],
  ]);
});

test('prévia: o equipado monta o personagem e o item em prova troca só o seu encaixe', () => {
  const shop = {
    equipped: [
      equippedPiece('skin', 'veludo', { visualValue: 'veludo', layer: 'front' }),
      equippedPiece('head', 'bone', { visualValue: 'bone', color: '#F51300' }),
      equippedPiece('frame', 'moldura', { visualValue: 'frame-violet' }),
    ],
    items: [],
  };
  const worn = model.buildCharacterLook(shop, null);
  assert.deepEqual(Object.keys(plain(worn)).sort(), ['head', 'skin']);
  assert.equal(worn.head.color, '#F51300');
  assert.equal(worn.skin.visualValue, 'veludo');

  const cartola = item(9, 'head', { visualValue: 'cartola', artUrl: 'https://cdn.exemplo/cartola.png', adjust: { x: 3, y: -4, scale: 0.8 }, layer: 'back' });
  const tried = model.buildCharacterLook(shop, cartola);
  assert.equal(tried.head.visualValue, 'cartola');
  assert.equal(tried.head.artUrl, 'https://cdn.exemplo/cartola.png');
  assert.equal(tried.head.color, null);
  // A peça em prova leva o ajuste e a camada do próprio item.
  assert.deepEqual(plain(tried.head.adjust), { x: 3, y: -4, scale: 0.8 });
  assert.equal(tried.head.layer, 'back');
  assert.equal(tried.skin.visualValue, 'veludo');

  // Moldura, título e emblema não fazem parte do personagem.
  assert.deepEqual(plain(model.buildCharacterLook(shop, item(10, 'badge'))), plain(worn));
  // Item já equipado em prova mantém cor e ajuste que o backend enviou.
  const same = model.buildCharacterLook(shop, item(2, 'head', { slug: 'bone', equipped: true, owned: true }));
  assert.equal(same.head.color, '#F51300');
  assert.deepEqual(plain(same.head.adjust), { x: 1, y: 2, scale: 1.5 });
});

test('fundo e tema do card: classes conhecidas, arte segura e cor só em hexadecimal', () => {
  const piece = (visualValue, extra = {}) => ({ visualValue, artUrl: null, color: null, adjust: { x: 0, y: 0, scale: 1 }, layer: 'front', ...extra });
  assert.equal(model.stageTheme(undefined).className, 'chr-bg--palco');
  assert.equal(model.stageTheme(piece('noite')).className, 'chr-bg--noite');
  assert.equal(model.stageTheme(piece('desconhecido')).className, 'chr-bg--palco');
  // Fundos antigos do catálogo seguem as classes de cosmetics.css.
  assert.equal(model.stageTheme(piece('background-academy')).className, 'cosmetic-background-host background-academy');
  const custom = model.stageTheme(piece('custom', { color: '#FE96C7' }));
  assert.equal(custom.className, 'chr-bg--custom');
  assert.deepEqual(plain(custom.style), { backgroundColor: '#FE96C7' });
  assert.equal(model.stageTheme(piece('custom', { color: 'red; x:y' })).style, undefined);
  const art = model.stageTheme(piece('x', { artUrl: 'https://cdn.exemplo/fundo.png' }));
  assert.equal(art.className, 'chr-art');
  assert.equal(art.style.backgroundImage, 'url("https://cdn.exemplo/fundo.png")');
  assert.equal(model.stageTheme(piece('x', { artUrl: 'javascript:alert(1)' })).className, 'chr-bg--palco');
  assert.equal(model.stageTheme(piece('x', { artUrl: 'https://a/b").c' })).className, 'chr-bg--palco');

  assert.equal(model.cardTheme(undefined).className, 'chr-card--classico');
  assert.equal(model.cardTheme(piece('ouro')).className, 'chr-card--ouro');
  assert.equal(model.cardTheme(piece('qualquer')).className, 'chr-card--classico');
  const frame = model.cardTheme(piece('x', { artUrl: 'https://cdn.exemplo/tema.png' }));
  assert.equal(frame.className, 'chr-art chr-card-frame');
  assert.equal(frame.frameUrl, 'https://cdn.exemplo/tema.png');
  assert.equal(frame.style, undefined);
  assert.equal(model.cardTheme(piece('ouro')).frameUrl, null);
  assert.equal(model.stageTheme(piece('x', { artUrl: 'https://cdn.exemplo/fundo.png' })).frameUrl, null);
  for (const artUrl of ['javascript:alert(1)', 'https://a/b").c', "https://a/b'c", 'https://a/b c.png']) {
    const unsafe = model.cardTheme(piece('ouro', { artUrl }));
    assert.equal(unsafe.className, 'chr-card--ouro');
    assert.equal(unsafe.style, undefined);
    assert.equal(unsafe.frameUrl, null);
  }
  assert.equal(model.cardTheme(piece('x', { artUrl: 'https://a/b").c' })).className, 'chr-card--classico');
});

test('cor: só recolorível ou fundo "do seu jeito"; a paleta espelha os tokens da marca', () => {
  assert.equal(model.acceptsColor(item(1, 'head', { recolorable: true })), true);
  assert.equal(model.acceptsColor(item(1, 'head')), false);
  assert.equal(model.acceptsColor(item(1, 'background', { visualValue: 'custom' })), true);
  assert.equal(model.acceptsColor(item(1, 'background', { visualValue: 'noite' })), false);
  const theme = fs.readFileSync(path.join(__dirname, '../src/styles/theme.css'), 'utf8');
  for (const choice of model.COLOR_CHOICES) {
    assert.match(choice.hex, /^#[0-9A-F]{6}$/);
    const declared = new RegExp(`${choice.token}:\\s*(#[0-9a-fA-F]{6})`).exec(theme);
    assert.ok(declared, `${choice.token} não existe em theme.css`);
    assert.equal(declared[1].toUpperCase(), choice.hex);
  }
  assert.equal(model.sameColor('#f51300', '#F51300'), true);
  assert.equal(model.sameColor(null, '#F51300'), false);
});

test('rótulo acessível do item e estado do kit', () => {
  assert.equal(model.characterItemLabel(item(1, 'head', { name: 'Coroa', rarity: 'legendary' }), 100), 'Coroa, Cabeça, Lendária, custa 50 chaves. Experimentar na prévia');
  assert.match(model.characterItemLabel(item(1, 'skin', { owned: true, equipped: true }), 0), /equipado/);
  assert.equal(model.kitState({ owned: true, affordable: false, unlock: unlock(false) }), 'own');
  assert.equal(model.kitState({ owned: false, affordable: true, unlock: unlock(false) }), 'lock');
  assert.equal(model.kitState({ owned: false, affordable: false, unlock: unlock(true) }), 'save');
  assert.equal(model.kitState({ owned: false, affordable: true, unlock: unlock(true) }), 'buy');
});

test('comemorativo: evento e prazo em data de Brasília, só se o backend mandar evento', () => {
  assert.equal(model.festiveLabel({ festiveEvent: 'Natal', availableUntil: '2026-12-31T23:59:59.999-03:00' }), 'Natal · até 31/12/2026');
  assert.equal(model.festiveLabel({ festiveEvent: 'Natal', availableUntil: null }), 'Natal');
  assert.equal(model.festiveLabel({ festiveEvent: null, availableUntil: '2026-12-31T23:59:59.999-03:00' }), null);
  assert.equal(collectibles.rarityLabel.festive, 'Comemorativa');
});
