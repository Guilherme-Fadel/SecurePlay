const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

const collectiblesModel = load('src/components/sections/HomePage/Awards/collectiblesModel.ts', {
  './albumModel': load('src/components/sections/HomePage/Awards/albumModel.ts', {}),
});
const legacy = load('src/components/admin/collectibles/legacyTypes.ts', {});
const form = load('src/components/admin/collectibles/adminCollectiblesForm.ts', { './legacyTypes': legacy });
const model = load('src/components/admin/collectibles/adminCollectiblesModel.ts', {
  './legacyTypes': legacy,
  '@/components/sections/HomePage/Awards/collectiblesModel': collectiblesModel,
});
const plain = (value) => JSON.parse(JSON.stringify(value));

test('estado: publicado quando ativo; inativo é "Não publicado" (o backend não separa arquivado)', () => {
  assert.equal(model.collectibleStatus({ active: true }), 'published');
  assert.equal(model.collectibleStatus({ active: false }), 'unpublished');
  assert.equal(model.statusLabel.published, 'Publicado');
  assert.equal(model.statusLabel.unpublished, 'Não publicado');
  assert.equal(model.statusLabel.archived, 'Arquivado');
  // Nenhum estado de linha chega em "archived" enquanto a API só informa `active`.
  assert.ok([true, false].every((active) => model.collectibleStatus({ active }) !== 'archived'));
});

test('ações da linha: publicado arquiva, inativo publica, editar sempre disponível', () => {
  assert.deepEqual(plain(model.rowActions({ active: true })), { edit: true, publish: false, archive: true });
  assert.deepEqual(plain(model.rowActions({ active: false })), { edit: true, publish: true, archive: false });
});

test('encaixe e raridade em português, reaproveitando os rótulos da loja', () => {
  assert.equal(model.slotLabel('skin'), 'Skin');
  assert.equal(model.slotLabel('head'), 'Cabeça');
  assert.equal(model.slotLabel('face'), 'Rosto');
  assert.equal(model.slotLabel('neck'), 'Pescoço');
  assert.equal(model.slotLabel('effect'), 'Efeito');
  // Moldura, título e emblema foram descontinuados: itens antigos aparecem como "Legado".
  for (const legacy of ['frame', 'title', 'badge']) assert.equal(model.slotLabel(legacy), 'Legado');
  assert.equal(model.piecesLabel([{ type: 'head' }, { type: 'frame' }]), '2 peças: Cabeça, Legado');
  assert.equal(model.rarityName('common'), 'Comum');
  assert.equal(model.rarityName('uncommon'), 'Incomum');
  assert.equal(model.rarityName('rare'), 'Rara');
  assert.equal(model.rarityName('epic'), 'Épica');
  assert.equal(model.rarityName('legendary'), 'Lendária');
  assert.equal(model.rarityName('festive'), 'Comemorativa');
});

test('peças do kit: encaixes na ordem do personagem, singular e vazio', () => {
  const piece = (type) => ({ type });
  assert.equal(model.piecesLabel([]), 'Sem peças');
  assert.equal(model.piecesLabel([piece('skin')]), '1 peça: Skin');
  assert.equal(model.piecesLabel([piece('effect'), piece('head'), piece('skin')]), '3 peças: Skin, Cabeça, Efeito');
});

test('preço em chaves, com singular', () => {
  assert.equal(model.priceLabel(0), '0 chaves');
  assert.equal(model.priceLabel(1), '1 chave');
  assert.equal(model.priceLabel(35), '35 chaves');
});

test('período só existe para Comemorativa, em datas de Brasília', () => {
  const festive = { rarity: 'festive', festiveEvent: 'Natal', availableFrom: '2026-12-01T03:00:00.000Z', availableUntil: '2026-12-26T02:59:59.999Z' };
  assert.equal(model.periodLabel(festive), 'Natal · 01/12/2026 a 25/12/2026');
  assert.equal(model.periodLabel({ ...festive, rarity: 'rare' }), '—');
  assert.equal(model.periodLabel({ rarity: 'common', festiveEvent: null, availableFrom: null, availableUntil: null }), '—');
  assert.equal(model.periodLabel({ ...festive, availableFrom: null }), 'Natal · até 25/12/2026');
  assert.equal(model.periodLabel({ ...festive, availableUntil: null }), 'Natal · a partir de 01/12/2026');
  assert.equal(model.periodLabel({ ...festive, availableFrom: null, availableUntil: null }), 'Natal');
  assert.equal(model.periodLabel({ ...festive, festiveEvent: null, availableFrom: null, availableUntil: null }), 'Comemorativa');
  assert.equal(model.periodLabel({ ...festive, availableFrom: 'invalida' }), 'Natal · até 25/12/2026');
});

test('query da listagem: página, tamanho e busca saneados; busca vazia fica de fora', () => {
  assert.deepEqual(plain(model.listParams({ page: 2, pageSize: 50, search: ' capa ' })), { page: 2, pageSize: 50, search: 'capa' });
  assert.deepEqual(plain(model.listParams({ page: 1, pageSize: 25, search: '   ' })), { page: 1, pageSize: 25 });
  assert.deepEqual(plain(model.listParams({ page: 0, pageSize: 1000, search: '' })), { page: 1, pageSize: 100 });
  assert.deepEqual(plain(model.listParams({ page: Number.NaN, pageSize: Number.NaN })), { page: 1, pageSize: 24 });
  assert.deepEqual(plain(model.listParams({ page: 3.9, pageSize: -3 })), { page: 3, pageSize: 1 });
  assert.equal(model.listParams({ page: 1, pageSize: 25, search: 'x'.repeat(150) }).search.length, 100);
});

test('query da listagem: encaixe só em itens, estado em ambos, valores desconhecidos ficam de fora', () => {
  const base = { page: 1, pageSize: 25 };
  assert.deepEqual(plain(model.listParams({ ...base, type: 'head', status: 'inactive' })), { ...base, type: 'head', status: 'inactive' });
  assert.deepEqual(plain(model.listParams({ ...base, type: 'head', status: 'active' }, 'kits')), { ...base, status: 'active' });
  assert.deepEqual(plain(model.listParams({ ...base, type: 'hat', status: 'archived' })), base);
  assert.deepEqual(plain(model.listParams({ ...base, type: '', status: '' })), base);
  assert.deepEqual(plain(model.listParams({ ...base, type: 'frame' })), base);
});

test('abas: Todos + encaixes do personagem, fundo e card; estado Todos | Publicados | Não publicados', () => {
  assert.deepEqual(plain(model.TYPE_FILTERS.map((entry) => entry.value)), ['', 'skin', 'head', 'face', 'neck', 'effect', 'background', 'card']);
  assert.deepEqual(plain(model.TYPE_FILTERS.slice(0, 3).map((entry) => entry.label)), ['Todos', 'Skin', 'Cabeça']);
  assert.deepEqual(plain(model.STATUS_FILTERS.map((entry) => entry.label)), ['Todos', 'Publicados', 'Não publicados']);
  assert.equal(model.hasActiveFilter(model.listParams({ page: 1, pageSize: 25 })), false);
  assert.equal(model.hasActiveFilter(model.listParams({ page: 1, pageSize: 25, status: 'active' })), true);
});

test('selos do cartão: comemorativa com período, com regra e recolorível', () => {
  const item = { rarity: 'rare', festiveEvent: null, availableFrom: null, availableUntil: null, unlockRule: null, requiredAchievementSlug: null, recolorable: false };
  assert.deepEqual(plain(model.cardBadges(item)), []);
  assert.deepEqual(plain(model.cardBadges({ ...item, recolorable: true, requiredAchievementSlug: 'a' })), ['Com regra', 'Recolorível']);
  const festive = { ...item, rarity: 'festive', festiveEvent: 'Natal', availableFrom: '2026-12-01T03:00:00.000Z', availableUntil: '2026-12-26T02:59:59.999Z', unlockRule: { mode: 'all', conditions: [] } };
  assert.deepEqual(plain(model.cardBadges(festive)), ['Comemorativa · Natal · 01/12/2026 a 25/12/2026', 'Com regra']);
  assert.deepEqual(plain(model.cardBadges({ ...festive, festiveEvent: null, availableFrom: null, availableUntil: null, unlockRule: null })), ['Comemorativa']);
  // Kit não tem conquista antiga nem recolorível: só a regra nova conta.
  const kit = { rarity: 'epic', festiveEvent: null, availableFrom: null, availableUntil: null, unlockRule: null, pieces: [] };
  assert.deepEqual(plain(model.cardBadges(kit)), []);
  assert.deepEqual(plain(model.cardBadges({ ...kit, unlockRule: { mode: 'any', conditions: [] } })), ['Com regra']);
});

test('personagem do kit: uma peça por encaixe do personagem, com arte, ajuste e camada', () => {
  const adjust = { x: 1, y: 2, scale: 1.5 };
  const piece = (type, extra = {}) => ({ type, visualValue: `${type}-v`, artUrl: null, adjust, layer: 'front', ...extra });
  const look = plain(model.kitLook({ pieces: [piece('head'), piece('effect', { layer: 'back', artUrl: 'https://cdn.test/e.png' }), piece('frame')] }));
  assert.deepEqual(Object.keys(look).sort(), ['effect', 'head']);
  assert.deepEqual(look.effect, { visualValue: 'effect-v', artUrl: 'https://cdn.test/e.png', color: null, adjust, layer: 'back' });
  assert.deepEqual(plain(model.kitLook({ pieces: [] })), {});
});

test('textos das listagens por tipo', () => {
  assert.equal(model.kindCopy.items.newLabel, 'Novo item');
  assert.equal(model.kindCopy.kits.newLabel, 'Novo kit');
  assert.equal(model.kindCopy.items.tab, 'Itens avulsos');
  assert.equal(model.kindCopy.kits.tab, 'Kits');
  assert.equal(model.kindCopy.items.emptyFilter, 'Nenhum item neste filtro.');
  assert.equal(model.kindCopy.kits.emptyFilter, 'Nenhum kit neste filtro.');
});

// Serviço: o upload faz presign, POST pré-assinado no bucket e confirmação, nessa ordem.
function loadService(overrides = {}) {
  const calls = [];
  const api = {
    post: async (url, body) => {
      calls.push(['post', url, body]);
      if (overrides.postError) throw overrides.postError;
      if (url.endsWith('/art/upload')) return { data: { uploadUrl: 'https://bucket.test/up', fields: { key: 'collectibles/tmp/a.png', policy: 'p' }, key: 'collectibles/tmp/a.png' } };
      return { data: { artKey: 's3://b/collectibles/a.png', artUrl: 'https://cdn.test/a.png' } };
    },
    get: async (url, config) => { calls.push(['get', url, config]); return { data: { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 } }; },
    patch: async (url, body) => { calls.push(['patch', url, body]); return { data: { id: 1 } }; },
  };
  const invalidated = [];
  const uploads = [];
  const fetchStub = async (url, init) => {
    uploads.push({ url, init });
    return { ok: overrides.uploadOk ?? true };
  };
  const service = load('src/services/adminCollectibles.ts', {
    './api': { api },
    '@/lib/queryCache': { invalidatePrefix: (prefix) => invalidated.push(prefix) },
    '@/lib/adminCache': { adminQueryKey: (resource) => `admin:session:${resource}` },
  }, {
    FormData: class { constructor() { this.entries = []; } append(name, value) { this.entries.push([name, value]); } },
    fetch: fetchStub,
  });
  return { service, calls, invalidated, uploads };
}

const png = { type: 'image/png', size: 1000, name: 'a.png' };

test('uploadCollectibleArt: presign, envio ao bucket com o arquivo por último e confirmação', async () => {
  const { service, calls, uploads } = loadService();
  const result = await service.uploadCollectibleArt(png);
  assert.deepEqual(plain(result), { artKey: 's3://b/collectibles/a.png', artUrl: 'https://cdn.test/a.png' });
  assert.deepEqual(calls.map((call) => call.slice(0, 2)), [['post', '/admin/collectibles/art/upload'], ['post', '/admin/collectibles/art/confirm']]);
  assert.deepEqual(plain(calls[0][2]), { contentType: 'image/png' });
  assert.deepEqual(plain(calls[1][2]), { key: 'collectibles/tmp/a.png' });
  assert.equal(uploads[0].url, 'https://bucket.test/up');
  assert.equal(uploads[0].init.method, 'POST');
  const names = uploads[0].init.body.entries.map(([name]) => name);
  assert.deepEqual(names, ['key', 'policy', 'file']);
});

test('uploadCollectibleArt: recusa tipo inválido e arquivo grande antes de chamar a API', async () => {
  const { service, calls } = loadService();
  await assert.rejects(service.uploadCollectibleArt({ type: 'image/jpeg', size: 10 }), /PNG ou SVG/);
  await assert.rejects(service.uploadCollectibleArt({ type: 'image/png', size: 200 * 1024 + 1 }), /200 KB/);
  assert.equal(calls.length, 0);
});

test('uploadCollectibleArt: falha do bucket não chega à confirmação', async () => {
  const { service, calls } = loadService({ uploadOk: false });
  await assert.rejects(service.uploadCollectibleArt(png), /enviar a arte/);
  assert.equal(calls.length, 1);
});

test('listagens e mudanças de estado usam as rotas do backend e invalidam o cache', async () => {
  const { service, calls, invalidated } = loadService();
  await service.listCollectibleItems({ page: 2, pageSize: 25, search: 'a' });
  await service.listCollectibleKits({ page: 1, pageSize: 50, status: 'active' });
  assert.deepEqual(plain(calls[0]), ['get', '/admin/collectibles/items', { params: { page: 2, pageSize: 25, search: 'a' } }]);
  assert.deepEqual(plain(calls[1]), ['get', '/admin/collectibles/kits', { params: { page: 1, pageSize: 50, status: 'active' } }]);
  await service.publishCollectible('kits', 4);
  await service.archiveCollectible('items', 9);
  assert.equal(calls[2][1], '/admin/collectibles/kits/4/publish');
  assert.equal(calls[3][1], '/admin/collectibles/items/9/archive');
  assert.deepEqual(plain(invalidated), ['admin:session:collectibles', 'admin:session:collectibles']);
});

test('criar e editar chamam POST e PATCH e invalidam o cache', async () => {
  const { service, calls, invalidated } = loadService();
  await service.createCollectibleItem({ name: 'x' });
  await service.updateCollectibleItem(3, { name: 'y' });
  await service.createCollectibleKit({ name: 'k' });
  await service.updateCollectibleKit(5, { name: 'k2' });
  assert.deepEqual(calls.map((call) => call.slice(0, 2)), [
    ['post', '/admin/collectibles/items'], ['patch', '/admin/collectibles/items/3'],
    ['post', '/admin/collectibles/kits'], ['patch', '/admin/collectibles/kits/5'],
  ]);
  assert.equal(invalidated.length, 4);
});

// Formulário: lógica pura de montagem do corpo, resumo da regra e validação no cliente.
const rule = (mode, ...requirements) => ({ mode, requirements: requirements.map((entry, index) => ({ id: index + 1, metric: 'xp_season', value: '', scope: 'empresa', slug: '', ...entry })) });
const validItem = (patch = {}) => ({ ...form.emptyItemForm(), name: 'Cartola dourada', slug: 'cartola-dourada', price: '40', ...patch });

test('slug sugerido a partir do nome: sem acento, minúsculo, hifenizado e dentro do limite', () => {
  assert.equal(form.slugify('Cartola Dourada'), 'cartola-dourada');
  assert.equal(form.slugify('  Óculos de Sol — Verão 2026! '), 'oculos-de-sol-verao-2026');
  assert.equal(form.slugify('###'), '');
  assert.equal(form.slugify('a'.repeat(100), 70).length, 70);
  assert.equal(form.slugify(`${'a'.repeat(69)} b`, 70), 'a'.repeat(69));
});

test('regra de liberação: sem condições vira null; valores viram números; Colocação leva o escopo', () => {
  assert.equal(form.buildUnlockRule(rule('all')), null);
  assert.deepEqual(plain(form.buildUnlockRule(rule('any',
    { metric: 'xp_season', value: '100' },
    { metric: 'rank', value: '10', scope: 'global' },
    { metric: 'streak', value: '5' },
  ))), { mode: 'any', conditions: [
    { metric: 'xp_season', min: 100 },
    { metric: 'rank', top: 10, scope: 'global' },
    { metric: 'streak', min: 5 },
  ] });
  assert.deepEqual(plain(form.buildUnlockRule(rule('all', { metric: 'achievement', slug: 'maratonista' }))), { mode: 'all', conditions: [{ metric: 'achievement', slug: 'maratonista' }] });
});

test('resumo da regra em português para "todas" e "qualquer uma"', () => {
  const both = [{ metric: 'xp_season', value: '100' }, { metric: 'streak', value: '5' }];
  assert.equal(form.ruleSummary(rule('all', ...both)), 'Libera com 100 XP na temporada e 5 dias seguidos de acesso.');
  assert.equal(form.ruleSummary(rule('any', ...both)), 'Libera com 100 XP na temporada ou 5 dias seguidos de acesso.');
  assert.equal(form.ruleSummary(rule('all', { metric: 'xp_total', value: '1500' })), 'Libera com 1.500 XP no total.');
  assert.equal(form.ruleSummary(rule('all', { metric: 'access_days', value: '1' }, { metric: 'streak', value: '1' })), 'Libera com 1 dia de acesso e 1 dia seguido de acesso.');
  assert.equal(form.ruleSummary(rule('all', { metric: 'rank', value: '10', scope: 'empresa' })), 'Libera com top 10 da temporada na escola.');
  assert.equal(form.ruleSummary(rule('all', { metric: 'rank', value: '3', scope: 'global' })), 'Libera com top 3 da temporada no ranking geral.');
  assert.equal(form.ruleSummary(rule('all')), 'Sem exigências: qualquer aluno pode adquirir.');
  assert.equal(form.ruleSummary(rule('all', { metric: 'xp_season', value: '' })), 'Preencha o valor das exigências para ver o resumo.');
});

test('corpo do item: datas YYYY-MM-DD só para Comemorativa, regra nula, arte e ajuste', () => {
  const plainItem = form.buildItemBody(validItem({ type: 'head', artKey: 's3://b/collectibles/a.png', adjust: { x: '2', y: '-3', scale: '1.25' } }));
  assert.deepEqual(plain(plainItem), {
    name: 'Cartola dourada', slug: 'cartola-dourada', description: '', type: 'head', rarity: 'common', price: 40,
    visualValue: '', artKey: 's3://b/collectibles/a.png', layer: 'front', recolorable: false, adjust: { x: 2, y: -3, scale: 1.25 },
    unlockRule: null, festiveEvent: null, availableFrom: null, availableUntil: null,
  });
  const festive = form.buildItemBody(validItem({ rarity: 'festive', festiveEvent: ' Natal ', availableFrom: '2026-12-01', availableUntil: '2026-12-25', rule: rule('all', { metric: 'xp_total', value: '50' }) }));
  assert.equal(festive.festiveEvent, 'Natal');
  assert.equal(festive.availableFrom, '2026-12-01');
  assert.equal(festive.availableUntil, '2026-12-25');
  assert.deepEqual(plain(festive.unlockRule), { mode: 'all', conditions: [{ metric: 'xp_total', min: 50 }] });
  // Trocar de Comemorativa para outra raridade limpa evento e período no backend.
  const back = form.buildItemBody(validItem({ rarity: 'rare', festiveEvent: 'Natal', availableFrom: '2026-12-01', availableUntil: '2026-12-25' }));
  assert.deepEqual([back.festiveEvent, back.availableFrom, back.availableUntil], [null, null, null]);
});

test('corpo do kit: peças desmarcadas ficam fora, id mantido nas existentes e peça nova sem id', () => {
  const kit = form.emptyKitForm();
  const pieces = kit.pieces.map((piece) => {
    if (piece.type === 'head') return { ...piece, on: true, id: 77, name: ' Chifres ', artKey: 's3://b/collectibles/h.png' };
    if (piece.type === 'effect') return { ...piece, on: true, name: 'Neve', layer: 'back', adjust: { x: '0', y: '4', scale: '0.9' } };
    if (piece.type === 'face') return { ...piece, on: false, id: 12, name: 'Nariz' };
    return piece;
  });
  const body = form.buildKitBody({ ...kit, name: 'Kit de Natal', slug: 'kit-de-natal', price: '200', pieces });
  assert.equal(body.price, 200);
  assert.deepEqual(plain(body.pieces), [
    { id: 77, type: 'head', name: 'Chifres', artKey: 's3://b/collectibles/h.png', layer: 'front', recolorable: false, adjust: { x: 0, y: 0, scale: 1 } },
    { type: 'effect', name: 'Neve', artKey: null, layer: 'back', recolorable: false, adjust: { x: 0, y: 4, scale: 0.9 } },
  ]);
  assert.equal(body.unlockRule, null);
  assert.deepEqual(plain(kit.pieces.map((piece) => piece.type)), ['skin', 'head', 'face', 'neck', 'effect']);
});

test('formulário a partir do registro: datas de Brasília, regra em rascunho e peças do kit', () => {
  const item = { id: 5, slug: 'cartola', name: 'Cartola', description: 'd', type: 'head', rarity: 'festive', price: 30, visualValue: 'cartola', kitId: null,
    festiveEvent: 'Natal', availableFrom: '2026-12-01T03:00:00.000Z', availableUntil: '2026-12-26T02:59:59.999Z',
    unlockRule: { mode: 'any', conditions: [{ metric: 'rank', top: 10, scope: 'global' }, { metric: 'xp_total', min: 500 }] },
    artKey: 's3://b/collectibles/a.png', artUrl: 'https://cdn.test/a.png', layer: 'back', recolorable: true, adjust: { x: 1, y: 2, scale: 1.1 }, active: false };
  const state = form.itemFormFromRecord(item);
  assert.equal(state.availableFrom, '2026-12-01');
  assert.equal(state.availableUntil, '2026-12-25');
  assert.equal(state.price, '30');
  assert.equal(state.slugEdited, true);
  assert.equal(state.rule.mode, 'any');
  assert.deepEqual(plain(state.rule.requirements.map(({ metric, value, scope }) => ({ metric, value, scope }))), [
    { metric: 'rank', value: '10', scope: 'global' }, { metric: 'xp_total', value: '500', scope: 'empresa' }]);
  assert.deepEqual(plain(state.adjust), { x: '1', y: '2', scale: '1.1' });
  // Corpo completo devolvido sem perder visualValue, camada e recolorir (o PATCH exige o corpo todo).
  const body = form.buildItemBody(state);
  assert.deepEqual([body.visualValue, body.layer, body.recolorable, body.artKey], ['cartola', 'back', true, 's3://b/collectibles/a.png']);
  assert.deepEqual(plain(body.unlockRule), plain(item.unlockRule));

  const kitState = form.kitFormFromRecord({ id: 9, slug: 'kit', name: 'Kit', description: '', rarity: 'rare', price: 10, festiveEvent: null, availableFrom: null, availableUntil: null, unlockRule: null, active: true,
    pieces: [{ ...item, id: 31, type: 'neck', name: 'Cachecol', kitId: 9 }] });
  const neck = kitState.pieces.find((piece) => piece.type === 'neck');
  assert.deepEqual([neck.on, neck.id, neck.name, neck.artUrl], [true, 31, 'Cachecol', 'https://cdn.test/a.png']);
  assert.equal(kitState.pieces.filter((piece) => piece.on).length, 1);
  assert.equal(kitState.pieces.length, 5);
});

test('validação do item: nome, slug, preço, descrição', () => {
  assert.deepEqual(plain(form.validateItemForm(validItem())), {});
  assert.ok(form.validateItemForm(validItem({ name: ' a ' })).name);
  assert.ok(form.validateItemForm(validItem({ slug: '' })).slug);
  assert.ok(form.validateItemForm(validItem({ slug: 'Com Espaço' })).slug);
  assert.ok(form.validateItemForm(validItem({ slug: 'x'.repeat(81) })).slug);
  assert.ok(form.validateItemForm(validItem({ price: '-1' })).price);
  assert.ok(form.validateItemForm(validItem({ price: '1.5' })).price);
  assert.ok(form.validateItemForm(validItem({ price: '' })).price);
  assert.ok(form.validateItemForm(validItem({ price: '100001' })).price);
  assert.equal(form.validateItemForm(validItem({ price: '0' })).price, undefined);
  assert.ok(form.validateItemForm(validItem({ description: 'x'.repeat(401) })).description);
});

test('validação: Comemorativa exige evento e período com fim igual ou depois do início', () => {
  const festive = (patch) => validItem({ rarity: 'festive', festiveEvent: 'Natal', availableFrom: '2026-12-01', availableUntil: '2026-12-25', ...patch });
  assert.deepEqual(plain(form.validateItemForm(festive({}))), {});
  assert.ok(form.validateItemForm(festive({ festiveEvent: '  ' })).festiveEvent);
  assert.ok(form.validateItemForm(festive({ festiveEvent: 'x'.repeat(41) })).festiveEvent);
  assert.ok(form.validateItemForm(festive({ availableFrom: '' })).period);
  assert.ok(form.validateItemForm(festive({ availableUntil: '' })).period);
  assert.ok(form.validateItemForm(festive({ availableUntil: '2026-11-30' })).period);
  assert.equal(form.validateItemForm(festive({ availableUntil: '2026-12-01' })).period, undefined);
  // Fora de Comemorativa o período não é cobrado.
  assert.deepEqual(plain(form.validateItemForm(validItem({ festiveEvent: '', availableFrom: '', availableUntil: '' }))), {});
});

test('validação das exigências: até 6, valor inteiro ≥ 1 e limites do backend', () => {
  const six = Array.from({ length: 6 }, () => ({ metric: 'xp_season', value: '10' }));
  assert.deepEqual(plain(form.validateItemForm(validItem({ rule: rule('all', ...six) }))), {});
  assert.ok(form.validateItemForm(validItem({ rule: rule('all', ...six, { metric: 'streak', value: '1' }) })).requirements);
  const errors = form.validateItemForm(validItem({ rule: rule('all', { metric: 'xp_season', value: '0' }, { metric: 'streak', value: '2.5' }, { metric: 'rank', value: '' }, { metric: 'rank', value: '1001' }, { metric: 'streak', value: '3651' }, { metric: 'xp_total', value: '10' }) }));
  assert.deepEqual(Object.keys(errors).sort(), ['req:1', 'req:2', 'req:3', 'req:4', 'req:5']);
  assert.equal(form.MAX_REQUIREMENTS, 6);
});

test('validação do ajuste fino: x e y numéricos, escala de 0,1 a 5 como no backend', () => {
  const adjust = (patch) => validItem({ adjust: { x: '0', y: '0', scale: '1', ...patch } });
  assert.deepEqual(plain(form.ADJUST_SCALE), { min: 0.1, max: 5, step: 0.05 });
  assert.deepEqual(plain(form.validateItemForm(adjust({ x: '-12', y: '30', scale: '0.5' }))), {});
  assert.deepEqual(plain(form.validateItemForm(adjust({ scale: '0.1' }))), {});
  assert.deepEqual(plain(form.validateItemForm(adjust({ scale: '2.05' }))), {});
  assert.deepEqual(plain(form.validateItemForm(adjust({ scale: '5' }))), {});
  assert.ok(form.validateItemForm(adjust({ scale: '5.05' })).adjust);
  assert.ok(form.validateItemForm(adjust({ scale: '0.05' })).adjust);
  assert.ok(form.validateItemForm(adjust({ scale: '0' })).adjust);
  assert.ok(form.validateItemForm(adjust({ x: 'abc' })).adjust);
  assert.ok(form.validateItemForm(adjust({ y: '501' })).adjust);
  assert.deepEqual(plain(form.parseAdjust({ x: 'abc', y: '3', scale: '' })), { x: 0, y: 3, scale: 1 });
});

test('fundo e tema do card: corpo com tema da biblioteca ou arte, sem ajuste a validar', () => {
  const background = validItem({ type: 'background', name: 'Pôr do sol', slug: 'por-do-sol', visualValue: 'por-do-sol' });
  assert.deepEqual(plain(form.buildItemBody(background)), {
    name: 'Pôr do sol', slug: 'por-do-sol', description: '', type: 'background', rarity: 'common', price: 40,
    visualValue: 'por-do-sol', artKey: null, layer: 'front', recolorable: false, adjust: { x: 0, y: 0, scale: 1 },
    unlockRule: null, festiveEvent: null, availableFrom: null, availableUntil: null,
  });
  const card = validItem({ type: 'card', name: 'Card ouro', slug: 'card-ouro', visualValue: '', artKey: 's3://b/collectibles/c.png' });
  const cardBody = form.buildItemBody(card);
  assert.deepEqual([cardBody.type, cardBody.visualValue, cardBody.artKey], ['card', '', 's3://b/collectibles/c.png']);
  // O ajuste não aparece para esses encaixes: um rascunho de ajuste inválido não bloqueia o salvamento.
  assert.deepEqual(plain(form.validateItemForm({ ...background, adjust: { x: 'abc', y: '', scale: '99' } })), {});
  assert.ok(form.validateItemForm(validItem({ type: 'head', adjust: { x: 'abc', y: '0', scale: '1' } })).adjust);
  assert.deepEqual([form.isThemeSlot('background'), form.isThemeSlot('card'), form.isThemeSlot('head')], [true, true, false]);
  assert.deepEqual(plain(form.ITEM_TYPES), ['skin', 'head', 'face', 'neck', 'effect', 'background', 'card']);
  assert.deepEqual(plain(form.SLOT_TYPES), ['skin', 'head', 'face', 'neck', 'effect']);
  // Trocar o encaixe não carrega o tema do encaixe anterior.
  assert.equal(form.changeItemType(background, 'card').visualValue, '');
  assert.equal(form.changeItemType(background, 'background').visualValue, 'por-do-sol');
});

test('prévia: fundo e tema do card entram na prévia com arte ou tema; sem nenhum dos dois, vazia', () => {
  const background = validItem({ type: 'background', visualValue: 'noite' });
  assert.deepEqual(Object.keys(form.itemPreviewLook(background)), ['background']);
  assert.equal(form.itemPreviewLook(background).background.visualValue, 'noite');
  const card = validItem({ type: 'card', visualValue: '', artUrl: 'https://cdn.test/c.png' });
  assert.equal(form.itemPreviewLook(card).card.artUrl, 'https://cdn.test/c.png');
  assert.deepEqual(plain(form.itemPreviewLook(validItem({ type: 'card', visualValue: '' }))), {});
  assert.deepEqual(plain(form.itemPreviewLook(validItem({ type: 'frame', visualValue: 'blue' }))), {});
});

const previewVisual = load('src/components/admin/collectibles/previewVisual.ts', {
  '@/components/sections/HomePage/Awards/characterModel': { STAGE_THEMES: ['palco', 'noite'], CARD_THEMES: ['classico', 'ouro'] },
  '@/components/shared/Character/characterArt': { hasLibraryArt: (slot, value) => slot === 'head' && ['gorro', 'coroa'].includes(value) },
  '@/components/shared/Character/characterLook': { isSafeArtUrl: (url) => typeof url === 'string' && /^https?:\/\//.test(url) },
});
const piece = (extra) => ({ visualValue: '', artUrl: null, color: null, adjust: { x: 0, y: 0, scale: 1 }, layer: 'front', ...extra });

test('prévia: peça de kit salva sem arte enviada entra na prévia com o valor da biblioteca', () => {
  const kit = form.kitFormFromRecord({ id: 1, slug: 'k', name: 'Kit', description: '', rarity: 'common', price: 5, festiveEvent: null, availableFrom: null, availableUntil: null, unlockRule: null, active: true,
    pieces: [{ id: 9, type: 'head', name: 'Gorro', visualValue: 'gorro', artKey: null, artUrl: null, layer: 'front', recolorable: false, adjust: { x: 0, y: 0, scale: 1 } }] });
  assert.equal(kit.pieces.find((entry) => entry.type === 'head').visualValue, 'gorro');
  assert.equal(form.kitPreviewLook(kit).head.visualValue, 'gorro');
  assert.equal(form.kitPreviewLook({ ...kit, pieces: kit.pieces.map((entry) => ({ ...entry, on: false })) }).head, undefined);
  // O valor da biblioteca serve só à prévia: o corpo enviado ao backend não o carrega.
  assert.equal('visualValue' in form.buildKitBody(kit).pieces[0], false);
});

test('aviso da prévia: só some com arte enviada ou valor conhecido da biblioteca', () => {
  assert.equal(previewVisual.previewHasVisual({}), false);
  assert.equal(previewVisual.previewHasVisual({ head: piece({ visualValue: 'gorro' }) }), true);
  assert.equal(previewVisual.previewHasVisual({ head: piece({ visualValue: 'desconhecido' }) }), false);
  assert.equal(previewVisual.previewHasVisual({ head: piece({ artUrl: 'https://cdn.test/a.png' }) }), true);
  assert.equal(previewVisual.previewHasVisual({ head: piece({ artUrl: 'javascript:alert(1)' }) }), false);
  assert.equal(previewVisual.previewHasVisual({ background: piece({ visualValue: 'noite' }) }), true);
  assert.equal(previewVisual.previewHasVisual({ background: piece({ visualValue: 'background-antigo' }) }), true);
  assert.equal(previewVisual.previewHasVisual({ background: piece({ visualValue: 'inexistente' }) }), false);
  assert.equal(previewVisual.previewHasVisual({ card: piece({ visualValue: 'ouro' }) }), true);
  assert.equal(previewVisual.previewHasVisual({ card: piece({ visualValue: 'noite' }) }), false);
});

test('item legado (moldura, título, emblema): abre para consulta, mas o formulário recusa salvar', () => {
  const record = { id: 6, slug: 'moldura-velha', name: 'Moldura velha', description: '', type: 'frame', rarity: 'rare', price: 5, visualValue: 'gold', kitId: null,
    festiveEvent: null, availableFrom: null, availableUntil: null, unlockRule: null, requiredAchievementSlug: null,
    artKey: null, artUrl: null, layer: 'front', recolorable: false, adjust: { x: 0, y: 0, scale: 1 }, active: false };
  const state = form.itemFormFromRecord(record);
  assert.equal(state.type, 'frame');
  assert.equal(legacy.isLegacyType('frame'), true);
  assert.equal(legacy.isLegacyType('head'), false);
  assert.equal(form.isItemSlot('frame'), false);
  assert.match(form.validateItemForm(state).type, /descontinuados/);
  assert.throws(() => form.buildItemBody(state), /descontinuado/);
  // Os encaixes que o cadastro oferece não incluem os legados.
  assert.deepEqual(plain(form.ITEM_TYPES), ['skin', 'head', 'face', 'neck', 'effect', 'background', 'card']);
  assert.equal(form.validateItemForm({ ...state, type: 'head' }).type, undefined);
});

test('conquista antiga do registro: vem do backend, fica só para leitura e não entra no corpo', () => {
  const record = { id: 5, slug: 'chapeu', name: 'Chapéu', description: '', type: 'head', rarity: 'rare', price: 5, visualValue: 'gold', kitId: null,
    festiveEvent: null, availableFrom: null, availableUntil: null, unlockRule: null, requiredAchievementSlug: 'veterano',
    artKey: null, artUrl: null, layer: 'front', recolorable: false, adjust: { x: 0, y: 0, scale: 1 }, active: true };
  const state = form.itemFormFromRecord(record);
  assert.equal(state.requiredAchievementSlug, 'veterano');
  assert.equal(Object.hasOwn(form.buildItemBody(state), 'requiredAchievementSlug'), false);
  assert.equal(form.itemFormFromRecord({ ...record, requiredAchievementSlug: undefined }).requiredAchievementSlug, null);
  assert.equal(form.emptyItemForm().requiredAchievementSlug, null);
});

test('validação do kit: ao menos uma peça marcada e nome em cada peça marcada; slug até 70', () => {
  const kit = (patch = {}, pieces) => ({ ...form.emptyKitForm(), name: 'Kit de Natal', slug: 'kit-de-natal', price: '200', ...patch, pieces: pieces ?? form.emptyKitForm().pieces });
  assert.ok(form.validateKitForm(kit()).pieces);
  const on = (type, patch = {}) => form.emptyKitForm().pieces.map((piece) => (piece.type === type ? { ...piece, on: true, name: 'Chifres', ...patch } : piece));
  assert.deepEqual(plain(form.validateKitForm(kit({}, on('head')))), {});
  assert.ok(form.validateKitForm(kit({}, on('head', { name: ' ' })))['piece:head']);
  assert.ok(form.validateKitForm(kit({ slug: 'k'.repeat(71) }, on('head'))).slug);
  assert.equal(form.validateKitForm(kit({ slug: 'k'.repeat(70) }, on('head'))).slug, undefined);
  assert.ok(form.validateKitForm(kit({ rarity: 'festive' }, on('head'))).festiveEvent);
});

test('alternar item e kit na criação leva os campos comuns e mantém os do tipo', () => {
  const item = validItem({ rarity: 'rare', description: 'texto', rule: rule('any', { metric: 'streak', value: '4' }), artKey: 's3://b/collectibles/a.png' });
  const kit = form.carryCommon(item, form.emptyKitForm());
  assert.deepEqual([kit.name, kit.slug, kit.rarity, kit.price, kit.description, kit.rule.mode], ['Cartola dourada', 'cartola-dourada', 'rare', '40', 'texto', 'any']);
  assert.equal(kit.rule.requirements.length, 1);
  assert.equal(kit.pieces.length, 5);
  assert.equal(form.carryCommon(kit, form.emptyItemForm()).artKey, null);
});

test('slug digitado: aceita o hífen no fim enquanto se digita e limpa as pontas ao sair do campo', () => {
  assert.equal(form.typeSlug('kit-'), 'kit-');
  assert.equal(form.typeSlug(`${form.typeSlug('kit-')}natal`), 'kit-natal');
  assert.equal(form.typeSlug('Kit Natal'), 'kit-natal');
  assert.equal(form.typeSlug('Kit--Ação!'), 'kit-acao');
  assert.equal(form.typeSlug('k'.repeat(90), 70).length, 70);
  assert.equal(form.finishSlug('-kit-natal-'), 'kit-natal');
  assert.equal(form.finishSlug('--'), '');
});

test('trocar o encaixe para fora de Efeito volta a camada para "na frente"', () => {
  const effect = validItem({ type: 'effect', layer: 'back' });
  assert.equal(form.changeItemType(effect, 'effect').layer, 'back');
  assert.equal(form.changeItemType(effect, 'head').layer, 'front');
  assert.equal(form.changeItemType(effect, 'head').type, 'head');
  assert.equal(form.changeItemType(validItem({ type: 'head', layer: 'front' }), 'effect').layer, 'front');
});

test('erro de um campo some quando o campo é editado; os outros continuam', () => {
  const before = validItem({ name: 'x', price: '-1', rule: rule('all', { metric: 'xp_season', value: '0' }, { metric: 'streak', value: '0' }) });
  const errors = form.validateItemForm(before);
  assert.deepEqual(Object.keys(errors).sort(), ['name', 'price', 'req:1', 'req:2']);
  const after = { ...before, name: 'xy', rule: { ...before.rule, requirements: [{ ...before.rule.requirements[0], value: '5' }, before.rule.requirements[1]] } };
  assert.deepEqual(Object.keys(form.pruneErrors(errors, before, after)).sort(), ['price', 'req:2']);
  assert.deepEqual(plain(form.pruneErrors(errors, before, before)), plain(errors));
  const festive = validItem({ rarity: 'festive', festiveEvent: '', availableFrom: '2026-12-02', availableUntil: '2026-12-01' });
  const festiveErrors = form.validateItemForm(festive);
  assert.deepEqual(Object.keys(festiveErrors).sort(), ['festiveEvent', 'period']);
  assert.deepEqual(Object.keys(form.pruneErrors(festiveErrors, festive, { ...festive, availableUntil: '2026-12-03' })), ['festiveEvent']);
  const kit = { ...form.emptyKitForm(), name: 'Kit', slug: 'kit', pieces: form.emptyKitForm().pieces.map((piece) => (piece.type === 'head' ? { ...piece, on: true } : piece)) };
  const kitErrors = form.validateKitForm(kit);
  assert.deepEqual(Object.keys(kitErrors), ['piece:head']);
  const named = { ...kit, pieces: kit.pieces.map((piece) => (piece.type === 'head' ? { ...piece, name: 'Chifres' } : piece)) };
  assert.deepEqual(plain(form.pruneErrors(kitErrors, kit, named)), {});
});

test('histórico guarda o registro salvo em modo de edição e o lê de volta', () => {
  const item = { id: 8, slug: 'cartola', name: 'Cartola', active: false };
  const kit = { id: 3, slug: 'kit', name: 'Kit', active: true, pieces: [] };
  assert.deepEqual(plain(model.openFormOf(model.savedFormState(item))), { kind: 'items', record: item });
  assert.deepEqual(plain(model.openFormOf(model.savedFormState(kit))), { kind: 'kits', record: kit });
  // Cadastro novo não tem registro; depois de salvar, o histórico passa a ter o criado.
  assert.deepEqual(plain(model.openFormOf(model.formNavigationState({ kind: 'items' }))), { kind: 'items' });
  assert.equal(model.openFormOf(model.formNavigationState({ kind: 'items' })).record, undefined);
  assert.equal(model.openFormOf(null), null);
  assert.equal(model.openFormOf({ collectibleForm: { kind: 'frames' } }), null);
  assert.equal(model.openFormOf('x'), null);
});

test('rolagem infinita: lote de 24 e parâmetros do lote respeitam os limites do backend', () => {
  assert.equal(model.FEED_PAGE_SIZE, 24);
  assert.deepEqual(plain(model.feedParams({ search: ' capa ', type: 'head', status: 'active' }, 'items', 3)), { page: 3, pageSize: 24, search: 'capa', type: 'head', status: 'active' });
  assert.deepEqual(plain(model.feedParams({ type: 'head' }, 'kits', 1)), { page: 1, pageSize: 24 });
});

const row = (id, extra = {}) => ({ id, name: `Item ${id}`, active: false, ...extra });
const batch = (page, ids, totalPages = 3) => ({ items: ids.map((id) => row(id)), page, pageSize: 24, total: 60, totalPages });

test('rolagem infinita: acrescentar lote deduplica por id (registro novo desloca o offset)', () => {
  const first = model.appendPage(model.emptyFeed, batch(1, [9, 8, 7]));
  assert.deepEqual(plain(first.items.map((entry) => entry.id)), [9, 8, 7]);
  const second = model.appendPage(first, batch(2, [7, 6, 5]));
  assert.deepEqual(plain(second.items.map((entry) => entry.id)), [9, 8, 7, 6, 5]);
  assert.equal(second.page, 2);
  assert.equal(second.total, 60);
});

test('rolagem infinita: hasMore enquanto a página carregada é menor que totalPages', () => {
  assert.equal(model.feedHasMore(model.emptyFeed), false);
  assert.equal(model.feedHasMore({ page: 1, totalPages: 3 }), true);
  assert.equal(model.feedHasMore({ page: 3, totalPages: 3 }), false);
  assert.equal(model.feedHasMore({ page: 1, totalPages: 0 }), false);
});

test('rolagem infinita: trocar filtro muda a chave e o lote 1 recomeça a lista', () => {
  const base = { search: 'a' };
  assert.equal(model.feedKey('items', base), model.feedKey('items', { search: 'a' }));
  for (const other of [{ search: 'b' }, { search: 'a', type: 'head' }, { search: 'a', status: 'active' }]) assert.notEqual(model.feedKey('items', base), model.feedKey('items', other));
  assert.notEqual(model.feedKey('items', base), model.feedKey('kits', base));
  const loaded = model.appendPage(model.appendPage(model.emptyFeed, batch(1, [3, 2, 1])), batch(2, [0]));
  const restarted = model.appendPage(loaded, batch(1, [3, 2]));
  assert.deepEqual(plain(restarted.items.map((entry) => entry.id)), [3, 2]);
  assert.equal(restarted.page, 1);
});

test('publicar/tirar da loja: o cartão é trocado no lugar, sem mexer na ordem nem nos demais', () => {
  const items = [row(3), row(2), row(1)];
  const next = model.replaceRow(items, row(2, { active: true }));
  assert.deepEqual(plain(next.map((entry) => entry.id)), [3, 2, 1]);
  assert.equal(next[1].active, true);
  assert.equal(next[0], items[0]);
  assert.deepEqual(plain(model.replaceRow(items, row(99))), plain(items));
});

// Importar JSON: arquivo exportado pelo organizador de artes preenche o formulário do item avulso.
const importer = load('src/components/admin/collectibles/collectibleImport.ts', {
  '@/services/adminCollectibles': loadService().service,
  './adminCollectiblesForm': form,
}, { atob, File });
const PNG_B64 = Buffer.from('arte-de-teste').toString('base64');
const exported = (item = {}, root = {}) => JSON.stringify({
  formato: 'secureplay-colecionavel', versao: 1, exportadoEm: '2026-11-25T15:00:00.000Z',
  item: { nome: 'Fone gamer', encaixe: 'head', ...item }, ...root,
});
const importError = (item, root) => { const result = importer.parseCollectibleImport(exported(item, root)); assert.equal(result.ok, false); return result.error; };

test('importar: arquivo completo vira patch do formulário e arte para enviar', () => {
  const result = importer.parseCollectibleImport(exported({
    slug: 'fone-gamer', descricao: ' Para quem estuda ouvindo música. ', raridade: 'rare', preco: 120, camada: 'front',
    ajuste: { x: 10, y: -5, escala: 1.5 }, arte: { nome: 'head_fone.png', tipo: 'image/png', dados: `data:image/png;base64,${PNG_B64}` },
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(plain(result.form), {
    name: 'Fone gamer', slug: 'fone-gamer', slugEdited: true, description: 'Para quem estuda ouvindo música.', rarity: 'rare', price: '120',
    type: 'head', layer: 'front', adjust: { x: '10', y: '-5', scale: '1.5' }, visualValue: '',
  });
  assert.deepEqual(plain(result.art), { name: 'head_fone.png', type: 'image/png', base64: PNG_B64 });
});

test('importar: só nome e encaixe bastam; slug sai do nome e o resto assume o padrão (ajuste 0, 0, 1)', () => {
  const result = importer.parseCollectibleImport(exported({ nome: 'Óculos Mágico!' }));
  assert.equal(result.ok, true);
  assert.deepEqual(plain(result.form), {
    name: 'Óculos Mágico!', slug: 'oculos-magico', slugEdited: true, description: '', rarity: 'common', price: '0',
    type: 'head', layer: 'front', adjust: { x: '0', y: '0', scale: '1' }, visualValue: '',
  });
  assert.equal(result.art, null);
});

test('importar: campos desconhecidos são ignorados e não entram no patch', () => {
  const result = importer.parseCollectibleImport(exported({ extra: 'x', slugEdited: false, artKey: 'k' }, { outro: 1 }));
  assert.equal(result.ok, true);
  assert.equal('artKey' in result.form, false);
  assert.equal(result.form.slugEdited, true);
  assert.equal('extra' in result.form, false);
});

test('importar: raridade festiva é recusada; as demais valem', () => {
  assert.match(importError({ raridade: 'festive' }), /Comemorativa/);
  assert.match(importError({ raridade: 'mythic' }), /raridade/);
  for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary']) assert.equal(importer.parseCollectibleImport(exported({ raridade: rarity })).form.rarity, rarity);
});

test('importar: encaixe obrigatório e dentro da lista (inclui fundo e tema do card)', () => {
  assert.match(importError({ encaixe: 'hat' }), /encaixe/);
  assert.match(importError({ encaixe: undefined }), /encaixe/);
  for (const slot of ['skin', 'head', 'face', 'neck', 'effect', 'background', 'card']) assert.equal(importer.parseCollectibleImport(exported({ encaixe: slot })).form.type, slot);
});

test('importar: preço inteiro de 0 a 100.000', () => {
  for (const price of [-1, 100001, 1.5, '10', true]) assert.equal(importError({ preco: price }), 'O preço deve ser um número inteiro de 0 a 100.000.');
  assert.equal(importer.parseCollectibleImport(exported({ preco: 100000 })).form.price, '100000');
});

test('importar: ajuste fora da faixa é recusado', () => {
  assert.match(importError({ ajuste: { x: 501 } }), /x e y/);
  assert.match(importError({ ajuste: { y: '1' } }), /x e y/);
  assert.match(importError({ ajuste: { escala: 0.05 } }), /escala/);
  assert.match(importError({ ajuste: { escala: 5.5 } }), /escala/);
  assert.match(importError({ ajuste: 3 }), /ajuste/);
});

test('importar: nome, slug e descrição seguem os limites do console', () => {
  assert.match(importError({ nome: ' a ' }), /nome/);
  assert.match(importError({ nome: 'x'.repeat(121) }), /nome/);
  assert.match(importError({ slug: 'Fone Gamer' }), /slug/);
  assert.match(importError({ slug: 'a'.repeat(81) }), /slug/);
  assert.match(importError({ descricao: 'd'.repeat(401) }), /descrição/);
  assert.match(importError({ nome: '!!' }), /slug/);
});

test('importar: formato, versão e JSON inválidos têm mensagem própria', () => {
  assert.equal(importError({}, { formato: 'outro' }), 'Este arquivo não é um colecionável exportado pelo organizador.');
  assert.equal(importError({}, { versao: 2 }), 'Versão do arquivo não suportada.');
  assert.equal(importer.parseCollectibleImport('{ não é json').error, 'O arquivo não é um JSON válido.');
  assert.equal(importer.parseCollectibleImport('[]').error, 'Este arquivo não é um colecionável exportado pelo organizador.');
  // Arquivo de 1 item acima de 1 MB é recusado; um lote grande recebe a orientação de usar a lista.
  const grande = JSON.stringify({ formato: 'secureplay-colecionavel', versao: 1, item: { nome: 'Coroa', encaixe: 'head' }, sobra: 'x'.repeat(1024 * 1024) });
  assert.equal(importer.parseCollectibleImport(grande).error, 'O arquivo passa de 1 MB.');
  const loteGrande = JSON.stringify({ formato: 'secureplay-colecionavel', versao: 1, itens: [{ nome: 'Coroa', encaixe: 'head' }], sobra: 'x'.repeat(1024 * 1024) });
  assert.equal(importer.parseCollectibleImport(loteGrande).error, 'Este arquivo tem vários itens. Use Importar JSON na lista de colecionáveis.');
});

test('importar: camada "back" só vale para Efeito; nos demais encaixes volta para "front"', () => {
  assert.equal(importer.parseCollectibleImport(exported({ encaixe: 'effect', camada: 'back' })).form.layer, 'back');
  assert.equal(importer.parseCollectibleImport(exported({ encaixe: 'head', camada: 'back' })).form.layer, 'front');
  assert.match(importError({ camada: 'middle' }), /camada/);
});

test('importar: arte com tipo diferente do dataURL, tipo inválido ou base64 malformado é recusada', () => {
  assert.match(importError({ arte: { tipo: 'image/svg+xml', dados: `data:image/png;base64,${PNG_B64}` } }), /não correspondem ao tipo/);
  assert.match(importError({ arte: { tipo: 'image/gif', dados: 'data:image/gif;base64,R0lG' } }), /PNG ou SVG/);
  assert.match(importError({ arte: { tipo: 'image/png', dados: 'data:image/png;base64,@@@@' } }), /inválidos/);
  assert.match(importError({ arte: { tipo: 'image/png', dados: 'iVBORw0' } }), /inválidos/);
});

test('importar: arte de até 200 KB passa e acima disso é recusada', () => {
  const big = (bytes) => ({ nome: 'g.png', tipo: 'image/png', dados: `data:image/png;base64,${Buffer.alloc(bytes, 1).toString('base64')}` });
  assert.equal(importer.parseCollectibleImport(exported({ arte: big(200 * 1024) })).ok, true);
  assert.equal(importError({ arte: big(200 * 1024 + 1) }), 'A arte passa de 200 KB.');
});

test('importar: arte sem nome recebe nome pelo tipo', () => {
  const svg = Buffer.from('<svg/>').toString('base64');
  const result = importer.parseCollectibleImport(exported({ arte: { tipo: 'image/svg+xml', dados: `data:image/svg+xml;base64,${svg}` } }));
  assert.equal(result.art.name, 'arte.svg');
});

// Importar JSON em lote: `itens` (ou um `item`) na lista de colecionáveis.
const batchFile = (itens, root = {}) => JSON.stringify({ formato: 'secureplay-colecionavel', versao: 1, exportadoEm: '2026-11-25T15:00:00.000Z', itens, ...root });
const entryOf = (nome, extra = {}) => ({ nome, encaixe: 'head', ...extra });

test('lote: três itens válidos, na ordem do arquivo e com índice a partir de 0', () => {
  const art = { nome: 'c.png', tipo: 'image/png', dados: `data:image/png;base64,${PNG_B64}` };
  const result = importer.parseCollectibleBatch(batchFile([entryOf('Coroa', { arte: art }), entryOf('Fone gamer', { encaixe: 'face', preco: 50 }), entryOf('Capa', { encaixe: 'neck' })]));
  assert.equal(result.ok, true);
  assert.deepEqual(plain(result.entries.map((entry) => [entry.index, entry.ok, entry.form.slug, entry.form.type])), [[0, true, 'coroa', 'head'], [1, true, 'fone-gamer', 'face'], [2, true, 'capa', 'neck']]);
  assert.equal(result.entries[0].art.name, 'c.png');
  assert.equal(result.entries[1].art, null);
  assert.equal(result.entries[1].form.price, '50');
});

test('lote: arquivo com "item" vira um lote de 1', () => {
  const result = importer.parseCollectibleBatch(exported({ nome: 'Coroa' }));
  assert.equal(result.ok, true);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].ok, true);
  assert.equal(result.entries[0].form.slug, 'coroa');
});

test('lote: item inválido no meio não derruba os outros e traz nome e motivo', () => {
  const result = importer.parseCollectibleBatch(batchFile([entryOf('Coroa'), entryOf('Chapéu', { encaixe: 'hat' }), 42, entryOf('Capa')]));
  assert.equal(result.ok, true);
  assert.deepEqual(plain(result.entries.map((entry) => entry.ok)), [true, false, false, true]);
  assert.equal(result.entries[1].name, 'Chapéu');
  assert.match(result.entries[1].error, /encaixe/);
  assert.equal(result.entries[2].name, undefined);
  assert.match(result.entries[2].error, /formato válido/);
  assert.equal(result.entries[3].form.slug, 'capa');
});

test('lote: slug repetido no arquivo invalida só o segundo em diante', () => {
  const result = importer.parseCollectibleBatch(batchFile([entryOf('Coroa'), entryOf('Outra coroa', { slug: 'coroa' }), entryOf('Coroa!')]));
  assert.deepEqual(plain(result.entries.map((entry) => entry.ok)), [true, false, false]);
  assert.equal(result.entries[1].error, 'Slug repetido no arquivo');
  assert.equal(result.entries[2].error, 'Slug repetido no arquivo');
});

test('lote: "itens" vazio, acima de 50 ou fora de lista recusam o arquivo', () => {
  assert.equal(importer.parseCollectibleBatch(batchFile([])).ok, false);
  assert.equal(importer.parseCollectibleBatch(batchFile({})).ok, false);
  const fifty = Array.from({ length: 50 }, (_, index) => entryOf(`Item ${index}`));
  assert.equal(importer.parseCollectibleBatch(batchFile(fifty)).ok, true);
  const tooMany = importer.parseCollectibleBatch(batchFile([...fifty, entryOf('Item 50')]));
  assert.equal(tooMany.ok, false);
  assert.match(tooMany.error, /mais de 50/);
});

test('lote: "item" e "itens" juntos, formato, versão, JSON e tamanho recusam o arquivo', () => {
  assert.match(importer.parseCollectibleBatch(batchFile([entryOf('A')], { item: entryOf('B') })).error, /ao mesmo tempo/);
  assert.equal(importer.parseCollectibleBatch(batchFile([entryOf('A')], { formato: 'x' })).error, 'Este arquivo não é um colecionável exportado pelo organizador.');
  assert.equal(importer.parseCollectibleBatch(batchFile([entryOf('A')], { versao: 2 })).error, 'Versão do arquivo não suportada.');
  assert.equal(importer.parseCollectibleBatch('{ não é json').error, 'O arquivo não é um JSON válido.');
  assert.equal(importer.parseCollectibleBatch('x'.repeat(10 * 1024 * 1024 + 1)).error, 'O arquivo passa de 10 MB.');
  assert.equal(importer.parseCollectibleBatch('{"formato":"secureplay-colecionavel","versao":1}').ok, false);
});

test('lote: arquivo em lote com mais de 1 MB é aceito até 10 MB (cada arte segue o limite de 200 KB)', () => {
  const big = { nome: 'g.png', tipo: 'image/png', dados: `data:image/png;base64,${Buffer.alloc(150 * 1024, 1).toString('base64')}` };
  const text = batchFile(Array.from({ length: 8 }, (_, index) => entryOf(`Item ${index}`, { arte: big })));
  assert.ok(text.length > 1024 * 1024);
  assert.equal(importer.parseCollectibleBatch(text).ok, true);
  assert.equal(importer.parseCollectibleImport(batchFile([entryOf('A')], { item: entryOf('B') })).ok, false);
});

test('Novo item recusa arquivo com "itens" e aponta para a lista', () => {
  const text = batchFile([entryOf('A'), entryOf('B')]);
  assert.equal(importer.parseCollectibleImport(text).error, 'Este arquivo tem vários itens. Use Importar JSON na lista de colecionáveis.');
  assert.match(importer.parseCollectibleImport(batchFile([entryOf('A')], { item: entryOf('B') })).error, /ao mesmo tempo/);
});

test('corpo de criação do item importado: preço número, ajuste, camada, sem regra de liberação e com a chave da arte', () => {
  const result = importer.parseCollectibleImport(exported({ nome: 'Brilho', encaixe: 'effect', camada: 'back', preco: 75, ajuste: { x: 4, y: -3, escala: 1.5 }, raridade: 'epic', descricao: ' Um brilho. ' }));
  const body = plain(importer.buildImportedItemBody(result.form, 'art/abc.png'));
  assert.deepEqual(body, {
    name: 'Brilho', slug: 'brilho', description: 'Um brilho.', rarity: 'epic', price: 75, unlockRule: null,
    festiveEvent: null, availableFrom: null, availableUntil: null,
    type: 'effect', visualValue: '', artKey: 'art/abc.png', layer: 'back', recolorable: false, adjust: { x: 4, y: -3, scale: 1.5 },
  });
  assert.equal(plain(importer.buildImportedItemBody(result.form, null)).artKey, null);
});
