const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

const ranking = load('src/components/sections/HomePage/Ranking/rankingModel.ts', {});
const look = load('src/components/shared/Character/characterLook.ts', {});
const collectibles = load('src/components/sections/HomePage/Awards/collectiblesModel.ts', {
  './albumModel': load('src/components/sections/HomePage/Awards/albumModel.ts', {}),
});
const character = load('src/components/sections/HomePage/Awards/characterModel.ts', {
  './collectiblesModel': collectibles,
  '@/components/shared/Character/characterLook': look,
});
const boardRows = load('src/components/sections/HomePage/Ranking/boardModel.ts', { './rankingModel': ranking });
const hall = load('src/components/sections/HomePage/Ranking/hallModel.ts', {
  './rankingModel': ranking,
  './boardModel': boardRows,
  '../Awards/characterModel': character,
});
const board = load('src/components/sections/HomePage/Ranking/scoreboardModel.ts', {
  './rankingModel': ranking,
  './boardModel': boardRows,
  '../Awards/characterModel': character,
});
const paths = load('src/components/sections/HomePage/Ranking/hallCurtainPaths.ts', {});
const plain = (value) => JSON.parse(JSON.stringify(value));

const entry = (key, position, points, extra = {}) => ({ rankKey: `k${key}`, position, name: `Aluno ${key}`, points, level: 3, ...extra });
const piece = (visualValue, extra = {}) => ({ visualValue, artUrl: null, color: null, adjust: { x: 0, y: 0, scale: 1 }, layer: 'front', ...extra });

function data(overrides = {}) {
  return {
    mode: 'current', metric: 'seasonXp', selectedSeason: '2026-11', availableSeasons: [], dataCompleteness: 'complete',
    scope: 'company', companyAvailable: true, company: { id: 7, name: 'Escola' }, totalParticipants: 0,
    top: [], leaderboard: [], currentUser: null, viewerParticipates: false, weeklyHighlights: [],
    summary: { leaderPoints: 0, pointsBehindLeader: null, pointsToNextPosition: null, percentile: null },
    ...overrides,
  };
}

const list = (count) => Array.from({ length: count }, (_, index) => entry(index + 1, index + 1, 1000 - index));

test('lista do palco: a classificação recebida e, abaixo da 50ª, o próprio aluno no fim', () => {
  const board = list(50);
  const me = entry(999, 73, 120, { isCurrentUser: true });
  const outside = hall.hallEntries(data({ leaderboard: board, currentUser: me, viewerParticipates: true, totalParticipants: 140 }));
  assert.equal(outside.length, 51);
  assert.equal(outside[50].rankKey, 'k999');
  const inside = hall.hallEntries(data({ leaderboard: board, currentUser: { ...board[4], isCurrentUser: true }, viewerParticipates: true }));
  assert.equal(inside.length, 50);
  const manager = hall.hallEntries(data({ leaderboard: board, currentUser: me, viewerParticipates: false }));
  assert.equal(manager.length, 50);
  assert.deepEqual(plain(hall.hallEntries(data())), []);
});

test('destaque inicial é o 1º da lista; id que sumiu volta ao 1º; lista vazia não tem destaque', () => {
  const entries = list(5);
  assert.equal(hall.selectedEntry(entries, null).rankKey, 'k1');
  assert.equal(hall.selectedEntry(entries, 'k4').rankKey, 'k4');
  assert.equal(hall.selectedEntry(entries, 'sumiu').rankKey, 'k1');
  assert.equal(hall.selectedEntry([], 'k1'), null);
});

test('anterior e próxima percorrem a lista e param nos limites', () => {
  const entries = list(3);
  assert.equal(hall.stepEntry(entries, 'k1', 1), 'k2');
  assert.equal(hall.stepEntry(entries, 'k2', 1), 'k3');
  assert.equal(hall.stepEntry(entries, 'k3', 1), 'k3');
  assert.equal(hall.stepEntry(entries, 'k1', -1), 'k1');
  assert.equal(hall.stepEntry(entries, 'k3', -1), 'k2');
  assert.equal(hall.stepEntry(entries, null, 1), 'k2');
  assert.equal(hall.stepEntry([], null, 1), null);
  assert.deepEqual(plain([hall.canStep(entries, 'k1', -1), hall.canStep(entries, 'k1', 1), hall.canStep(entries, 'k3', 1), hall.canStep(entries, null, -1)]), [false, true, false, false]);
  assert.equal(hall.canStep(list(1), 'k1', 1), false);
});

test('pedestal: 1º, 2º e 3º têm estilo próprio e as demais posições são neutras; empate divide o estilo', () => {
  assert.deepEqual(plain([1, 2, 3, 4, 50, 73].map(hall.pedestalTier)), ['gold', 'silver', 'bronze', 'plain', 'plain', 'plain']);
  assert.equal(hall.pedestalTier(2), hall.pedestalTier(2));
  assert.deepEqual(plain(hall.pedestalLabel(1)), { text: '1º', size: 40 });
  assert.deepEqual(plain(hall.pedestalLabel(12)), { text: '12º', size: 34 });
  assert.deepEqual(plain(hall.pedestalLabel(140)), { text: '140º', size: 28 });
});

test('fundo e tema do card vêm do look; sem eles, palco padrão e card clássico', () => {
  const themed = hall.hallTheme({ background: piece('noite'), card: piece('ouro') });
  assert.equal(themed.stage.className, 'chr-bg--noite');
  assert.equal(themed.card.className, 'chr-card--ouro');
  const empty = hall.hallTheme({});
  assert.equal(empty.stage.className, 'chr-bg--palco');
  assert.equal(empty.card.className, 'chr-card--classico');
  assert.equal(hall.hallTheme(undefined).stage.className, 'chr-bg--palco');
  assert.equal(hall.hallTheme({ background: piece('inexistente'), card: piece('inexistente') }).card.className, 'chr-card--classico');
  const custom = hall.hallTheme({ background: piece('custom', { color: '#112233' }) });
  assert.equal(custom.stage.className, 'chr-bg--custom');
  assert.equal(custom.stage.style.backgroundColor, '#112233');
});

test('faixa "Nº lugar" e selo falam do escopo e do período, e o confete é só do 1º', () => {
  assert.deepEqual(plain(hall.hallBadge(1, 'company', 'current')), { number: '1º', caption: 'na sua escola' });
  assert.deepEqual(plain(hall.hallBadge(4, 'global', 'season')), { number: '4º', caption: 'entre todas as escolas · final' });
  assert.deepEqual(plain(hall.hallBadge(2, 'company', 'total')), { number: '2º', caption: 'na sua escola · geral' });
  assert.equal(hall.celebrates(1), true);
  assert.equal(hall.celebrates(2), false);
  assert.equal(hall.celebrates(0), false);
});

test('placa e aviso do leitor de tela: nome, posição e XP; "você" no próprio aluno', () => {
  const other = entry(1, 2, 4820, { name: 'Ana', level: 14, companyName: 'Colégio Ipê' });
  assert.equal(hall.hallPill(other, false), 'Nível 14');
  assert.equal(hall.hallPill(other, true), 'Colégio Ipê');
  assert.equal(hall.hallPill({ ...other, companyName: null }, true), 'Nível 14');
  assert.equal(hall.hallAnnouncement(other, false, 'na sua escola'), 'No palco: Ana, 2º lugar na sua escola, 4.820 XP.');
  assert.equal(hall.hallAnnouncement(other, true, 'na sua escola'), 'No palco: você, 2º lugar na sua escola, 4.820 XP.');
  assert.equal(hall.hallStepLabel('Bia', -1), 'Levar ao palco o aluno anterior: Bia');
  assert.equal(hall.hallStepLabel('Caio', 1), 'Levar ao palco o próximo aluno: Caio');
  assert.equal(hall.hallStepLabel(null, 1), 'Não há próximo aluno');
  assert.equal(hall.hallStepLabel(null, -1), 'Não há aluno anterior');
});

test('a cena muda com escopo, modo, temporada ou instituição, e não com o refetch', () => {
  const base = data({ leaderboard: list(3) });
  assert.equal(hall.hallSceneKey(base), hall.hallSceneKey(data({ leaderboard: list(5), totalParticipants: 9 })));
  assert.notEqual(hall.hallSceneKey(base), hall.hallSceneKey(data({ scope: 'global' })));
  assert.notEqual(hall.hallSceneKey(base), hall.hallSceneKey(data({ mode: 'total' })));
  assert.notEqual(hall.hallSceneKey(base), hall.hallSceneKey(data({ selectedSeason: '2026-10' })));
  assert.notEqual(hall.hallSceneKey(base), hall.hallSceneKey(data({ company: { id: 8, name: 'Outra' } })));
  assert.equal(hall.hallSceneKey(data({ company: null })), 'company|current|2026-11|self|xp|students');
});

test('cortina: sete faixas e as mesmas formas fechada e aberta', () => {
  const curtain = paths.curtainPaths();
  assert.equal(curtain.closed.length, 7);
  assert.equal(curtain.open.length, 7);
  const commands = (d) => d.replace(/[-\d.\s,]+/g, '|');
  curtain.closed.forEach((d, index) => assert.equal(commands(d), commands(curtain.open[index])));
  assert.equal(commands(curtain.closedEdge), commands(curtain.openEdge));
  assert.ok(curtain.closed.every((d) => !d.includes('NaN')));
});

test('cortina: a curva de suavização parte de 0, chega a 1 e nunca volta', () => {
  const ease = paths.cubicBezier(0.55, 0, 0.45, 1);
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(Math.abs(ease(0.5) - 0.5) < 1e-6);
  const samples = Array.from({ length: 21 }, (_, index) => ease(index / 20));
  samples.slice(1).forEach((value, index) => assert.ok(value >= samples[index]));
  assert.ok(ease(0.2) < 0.2);
  assert.ok(paths.cubicBezier(0.25, 0, 0.2, 1)(0.2) > 0.2);
});

test('cortina: cada quadro da abertura e do fechamento vai de uma ponta à outra, sem pular', () => {
  const curtain = paths.curtainPaths();
  const first = (d) => Number(d.split(' ')[0].slice(1));
  const edgeX = (d) => Number(d.split(' ')[2].slice(1));
  assert.deepEqual(plain(paths.curtainFrame('opening', 0)), plain({ bands: curtain.closed, edge: curtain.closedEdge }));
  assert.deepEqual(plain(paths.curtainFrame('opening', 1)), plain({ bands: curtain.open, edge: curtain.openEdge }));
  assert.deepEqual(plain(paths.curtainFrame('closing', 0)), plain({ bands: curtain.open, edge: curtain.openEdge }));
  assert.deepEqual(plain(paths.curtainFrame('closing', 1)), plain({ bands: curtain.closed, edge: curtain.closedEdge }));
  assert.deepEqual(plain(paths.curtainFrame('opening', -3).bands), plain(curtain.closed));
  assert.deepEqual(plain(paths.curtainFrame('opening', 9).bands), plain(curtain.open));
  // Faixa 6: a abertura recolhe a borda esquerda de 262 para perto de 89; a cada quadro ela só anda para a esquerda.
  const steps = Array.from({ length: 24 }, (_, index) => first(paths.curtainFrame('opening', index / 23).bands[6]));
  assert.equal(steps[0], first(curtain.closed[6]));
  assert.equal(steps[23], first(curtain.open[6]));
  steps.slice(1).forEach((value, index) => assert.ok(value <= steps[index] + 1e-9));
  assert.ok(steps[12] < steps[0] && steps[12] > steps[23], 'no meio do caminho a faixa não está nem fechada nem aberta');
  const closing = Array.from({ length: 24 }, (_, index) => first(paths.curtainFrame('closing', index / 23).bands[6]));
  closing.slice(1).forEach((value, index) => assert.ok(value >= closing[index] - 1e-9));
  assert.ok(edgeX(paths.curtainFrame('opening', 0.5).edge) < edgeX(curtain.closedEdge));
  const every = Array.from({ length: 11 }, (_, index) => paths.curtainFrame('opening', index / 10));
  assert.ok(every.every((frame) => frame.bands.length === 7 && frame.bands.every((d) => !d.includes('NaN'))));
});

test('cortina: fechar no meio da abertura parte da forma atual e chega à fechada, sem pular', () => {
  const closed = paths.curtainFrame('opening', 0);
  const mid = paths.curtainShape('opening', 0.5);
  const first = (d) => Number(d.split(' ')[0].slice(1));
  assert.ok(paths.curtainOpenness(mid) > 0 && paths.curtainOpenness(mid) < 1);
  assert.equal(paths.curtainOpenness(paths.curtainShape('opening', 0)), 0);
  assert.equal(paths.curtainOpenness(paths.curtainShape('opening', 1)), 1);
  assert.deepEqual(plain(paths.shapeFrame(paths.closeFrom(mid, 0))), plain(paths.shapeFrame(mid)));
  assert.deepEqual(plain(paths.shapeFrame(paths.closeFrom(mid, 1))), plain(closed));
  const steps = Array.from({ length: 20 }, (_, index) => first(paths.shapeFrame(paths.closeFrom(mid, index / 19)).bands[6]));
  steps.slice(1).forEach((value, index) => assert.ok(value >= steps[index] - 1e-9));
  assert.ok(paths.closeMs(mid) < paths.CURTAIN_MS.closing && paths.closeMs(mid) > 0);
  assert.equal(paths.closeMs(paths.curtainShape('opening', 1)), paths.CURTAIN_MS.closing);
});

test('cortina: abrir leva 1,15 s e fechar 0,6 s, como no canvas', () => {
  assert.equal(paths.CURTAIN_MS.opening, 1150);
  assert.equal(paths.CURTAIN_MS.closing, 600);
});

/* ---------- Placar (Task 4.2) ---------- */

test('placar: 8 por página, total de páginas (sempre ao menos 1) e fatia de cada página', () => {
  assert.equal(board.SCOREBOARD_PAGE_SIZE, 8);
  assert.deepEqual(plain([0, 1, 8, 9, 16, 17, 51].map(board.scoreboardPageCount)), [1, 1, 1, 2, 2, 3, 7]);
  const entries = list(20);
  assert.deepEqual(plain(board.scoreboardRows(entries, 0).map((item) => item.position)), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(plain(board.scoreboardRows(entries, 2).map((item) => item.position)), [17, 18, 19, 20]);
  assert.deepEqual(plain(board.scoreboardRows(entries, 9)), []);
  assert.deepEqual(plain(board.scoreboardRows([], 0)), []);
  assert.deepEqual(plain([-3, 0, 1, 2, 99].map((page) => board.clampScoreboardPage(page, 20))), [0, 0, 1, 2, 2]);
  assert.equal(board.clampScoreboardPage(4, 0), 0);
});

test('placar: a página do aluno em destaque; sem destaque ou id desconhecido, a primeira', () => {
  const entries = list(51);
  assert.equal(board.scoreboardPageOf(entries, 'k1'), 0);
  assert.equal(board.scoreboardPageOf(entries, 'k8'), 0);
  assert.equal(board.scoreboardPageOf(entries, 'k9'), 1);
  assert.equal(board.scoreboardPageOf(entries, 'k51'), 6);
  assert.equal(board.scoreboardPageOf(entries, null), 0);
  assert.equal(board.scoreboardPageOf(entries, 'sumiu'), 0);
  assert.equal(board.scoreboardPageOf([], 'k1'), 0);
});

test('placar: a página acompanha o destaque e respeita a escolha manual até o destaque mudar', () => {
  const entries = list(30);
  const at = (selectedId, pick) => board.resolveScoreboardPage(entries, selectedId, pick, `cena|${selectedId}`);
  assert.equal(at('k20', null), 2);
  assert.equal(at('k20', { anchor: 'cena|k20', page: 0 }), 0);
  assert.equal(at('k20', { anchor: 'cena|k3', page: 0 }), 2);
  assert.equal(at('k1', { anchor: 'cena|k1', page: 99 }), 3);
  assert.equal(at('k1', { anchor: 'cena|k1', page: -4 }), 0);
});

test('placar: texto da página, informação e rótulo de cada linha', () => {
  assert.equal(board.scoreboardPageLabel(1, 7), 'Página 2 de 7');
  assert.equal(board.scoreboardPageLabel(0, 1), 'Página 1 de 1');
  assert.equal(board.scoreboardInfo(0, 51, 51, 51), 'Mostrando 1 a 8 de 51');
  assert.equal(board.scoreboardInfo(6, 51, 51, 51), 'Mostrando 49 a 51 de 51');
  assert.equal(board.scoreboardInfo(0, 0, 0, 0), '');
  assert.equal(board.scoreboardInfo(0, 51, 50, 140), 'Top 50 de 140');
  const ana = entry(1, 3, 4820, { name: 'Ana' });
  assert.equal(board.scoreboardRowLabel(ana, { me: false, onStage: false }), '3º lugar, Ana, nível 3, 4.820 XP. Levar ao palco');
  assert.equal(board.scoreboardRowLabel(ana, { me: true, onStage: false }), '3º lugar, você, nível 3, 4.820 XP. Levar ao palco');
  assert.equal(board.scoreboardRowLabel(ana, { me: false, onStage: true }), '3º lugar, Ana, nível 3, 4.820 XP. No palco');
});

test('placar global: a instituição aparece abaixo do nome e no rótulo da linha; fora do global, não', () => {
  const ana = entry(1, 3, 4820, { name: 'Ana', companyName: 'Colégio Ipê' });
  assert.equal(board.scoreboardCompany(ana, true), 'Colégio Ipê');
  assert.equal(board.scoreboardCompany(ana, false), null);
  assert.equal(board.scoreboardCompany({ ...ana, companyName: null }, true), null);
  assert.equal(board.scoreboardCompany({ ...ana, companyName: '' }, true), null);
  assert.equal(board.scoreboardRowLabel(ana, { me: false, onStage: false, showCompany: true }), '3º lugar, Ana, Colégio Ipê, nível 3, 4.820 XP. Levar ao palco');
  assert.equal(board.scoreboardRowLabel(ana, { me: true, onStage: true, showCompany: true }), '3º lugar, você, Colégio Ipê, nível 3, 4.820 XP. No palco');
  assert.equal(board.scoreboardRowLabel(ana, { me: false, onStage: false, showCompany: false }), '3º lugar, Ana, nível 3, 4.820 XP. Levar ao palco');
  assert.equal(board.scoreboardRowLabel({ ...ana, companyName: null }, { me: false, onStage: false, showCompany: true }), '3º lugar, Ana, nível 3, 4.820 XP. Levar ao palco');
});

test('placar: o tema do card equipado veste a linha; sem ele, a linha comum', () => {
  assert.equal(board.scoreboardRowTheme(entry(1, 1, 10, { look: { card: piece('rosa') } })).className, 'chr-card--rosa');
  assert.equal(board.scoreboardRowTheme(entry(1, 1, 10, { look: { card: piece('classico') } })), null);
  assert.equal(board.scoreboardRowTheme(entry(1, 1, 10, { look: {} })), null);
  assert.equal(board.scoreboardRowTheme(entry(1, 1, 10)), null);
  const art = board.scoreboardRowTheme(entry(1, 1, 10, { look: { card: piece('x', { artUrl: 'https://cdn.exemplo.com/card.png' }) } }));
  assert.equal(art.className, 'chr-art chr-card-frame');
  assert.equal(art.frameUrl, 'https://cdn.exemplo.com/card.png');
});

// ---------- Cortina com carregamento (curtainFlow) ----------
const flow = load('src/components/sections/HomePage/Ranking/curtainFlow.ts', { './hallCurtainPaths': paths });
const at = (sceneKey, pending = false, reduceMotion = false) => ({ sceneKey, pending, reduceMotion });

test('cortina: troca de filtro aberta fecha, fica fechada carregando e abre com o resultado', () => {
  let state = flow.openedState('a');
  state = flow.syncFlow(state, at('a', true));
  assert.equal(state.phase, 'closing');
  assert.equal(state.lit, false);
  // O fechamento termina com a consulta ainda em andamento: espera fechada, sem abrir.
  state = flow.finishClosing(state, at('a', true));
  assert.equal(state.phase, 'closed');
  assert.equal(state.held, true);
  assert.equal(flow.finishWaiting(state, at('a', true)).phase, 'closed');
  assert.equal(flow.waitMs(state), 0);
  // Os dados chegam (cena nova): abre já com a cena nova.
  state = flow.syncFlow(state, at('b'));
  assert.equal(state.shownKey, 'b');
  state = flow.finishWaiting(state, at('b'));
  assert.equal(state.phase, 'opening');
  assert.equal(state.shownKey, 'b');
  assert.equal(state.entering, true);
});

test('cortina: dados antes do fim do fechamento esperam o fechamento acabar', () => {
  let state = flow.syncFlow(flow.openedState('a'), at('a', true));
  state = flow.syncFlow(state, at('b'));
  assert.equal(state.phase, 'closing');
  assert.equal(state.shownKey, 'a');
  state = flow.finishClosing(state, at('b'));
  assert.equal(state.phase, 'opening');
  assert.equal(state.shownKey, 'b');
});

test('cortina: trocas seguidas durante o carregamento mantêm fechada e abrem só com o último resultado', () => {
  let state = flow.syncFlow(flow.openedState('a'), at('a', true));
  state = flow.finishClosing(state, at('a', true));
  // Outro filtro: a consulta continua pendente (o palco ainda tem a cena a).
  state = flow.syncFlow(state, at('a', true));
  assert.equal(state.phase, 'closed');
  assert.equal(flow.finishWaiting(state, at('a', true)).phase, 'closed');
  state = flow.syncFlow(state, at('c'));
  state = flow.finishWaiting(state, at('c'));
  assert.equal(state.phase, 'opening');
  assert.equal(state.shownKey, 'c');
});

test('cortina: troca durante o fechamento segue fechando e consulta nova mantém fechada', () => {
  let state = flow.syncFlow(flow.openedState('a'), at('a', true));
  assert.equal(flow.syncFlow(state, at('a', true)), state);
  state = flow.finishClosing(flow.syncFlow(state, at('b', true)), at('b', true));
  assert.equal(state.phase, 'closed');
});

test('cortina: erro na consulta reabre com a cena que estava no palco', () => {
  let state = flow.finishClosing(flow.syncFlow(flow.openedState('a'), at('a', true)), at('a', true));
  state = flow.syncFlow(state, at('a', false));
  state = flow.finishWaiting(state, at('a', false));
  assert.equal(state.phase, 'opening');
  assert.equal(state.shownKey, 'a');
  // Erro antes de acabar de fechar: o fechamento termina e já reabre.
  const closing = flow.syncFlow(flow.openedState('a'), at('a', true));
  assert.equal(flow.finishClosing(closing, at('a', false)).phase, 'opening');
});

test('cortina: abrindo, um filtro novo fecha de novo; sem mudança, nada muda', () => {
  const opening = flow.finishWaiting(flow.waitingState('a'), at('a'));
  assert.equal(opening.phase, 'opening');
  assert.equal(flow.syncFlow(opening, at('a')), opening);
  assert.equal(flow.syncFlow(opening, at('a', true)).phase, 'closing');
  assert.equal(flow.syncFlow(opening, at('b')).phase, 'closing');
});

test('cortina: a entrada da tela espera e abre; a espera depois de carregar é zero', () => {
  const entry = flow.waitingState('a');
  assert.equal(flow.waitMs(entry), paths.CURTAIN_MS.wait);
  assert.equal(flow.finishWaiting(entry, at('a', true)).phase, 'closed');
  assert.equal(flow.syncFlow(entry, at('b')).shownKey, 'b');
});

test('cortina: movimento reduzido não anima, fica aberta na cena atual', () => {
  const state = flow.syncFlow(flow.waitingState('a'), at('b', true, true));
  assert.equal(state.phase, 'open');
  assert.equal(state.shownKey, 'b');
  assert.equal(flow.syncFlow(state, at('b', true, true)), state);
});

test('cortina: o aviso aparece fechada ou fechando durante a consulta, e sempre com movimento reduzido', () => {
  assert.equal(flow.waitNotice('closed', true, false), 'Trocando o placar…');
  assert.equal(flow.waitNotice('closing', true, false), 'Trocando o placar…');
  assert.equal(flow.waitNotice('open', true, true), 'Trocando o placar…');
  assert.equal(flow.waitNotice('open', true, false), '');
  assert.equal(flow.waitNotice('closed', false, false), '');
});
