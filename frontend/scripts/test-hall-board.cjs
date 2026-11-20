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
const board = load('src/components/sections/HomePage/Ranking/boardModel.ts', { './rankingModel': ranking });
const hall = load('src/components/sections/HomePage/Ranking/hallModel.ts', {
  './rankingModel': ranking,
  './boardModel': board,
  '../Awards/characterModel': character,
});
const scoreboard = load('src/components/sections/HomePage/Ranking/scoreboardModel.ts', {
  './rankingModel': ranking,
  './boardModel': board,
  '../Awards/characterModel': character,
});
const mine = load('src/components/sections/HomePage/Ranking/mineModel.ts', {
  './rankingModel': ranking,
  './boardModel': board,
  './hallModel': hall,
});
const plain = (value) => JSON.parse(JSON.stringify(value));

const stats = (xp, streak, challenges) => ({ xp, streak, challenges });
const student = (key, position, value, extra = {}) => ({
  rankKey: `k${key}`, position, name: `Aluno ${key}`, points: value, level: 3, value, stats: stats(value, 4, 7), ...extra,
});
const turma = (key, position, value, extra = {}) => ({
  rankKey: `t${key}`, position, name: `Turma ${key}`, companyName: null, studentCount: 12, value, stats: stats(value, 30, 80), mine: false, ...extra,
});

function data(overrides = {}) {
  return {
    category: 'xp', unit: 'students', mode: 'current', metric: 'seasonXp', selectedSeason: '2026-11', availableSeasons: [],
    dataCompleteness: 'complete', scope: 'company', companyAvailable: true, company: { id: 7, name: 'Escola' },
    totalParticipants: 0, top: [], leaderboard: [], currentUser: null, viewerParticipates: false, weeklyHighlights: [],
    summary: { leaderPoints: 0, pointsBehindLeader: null, pointsToNextPosition: null, percentile: null },
    ...overrides,
  };
}

test('rótulos e unidades por categoria, no singular e no plural', () => {
  assert.deepEqual(plain(board.CATEGORY_TABS.map((tab) => [tab.value, tab.label])), [['xp', 'XP'], ['streak', 'Sequência'], ['challenges', 'Desafios']]);
  assert.deepEqual(plain(board.UNIT_TABS.map((tab) => [tab.value, tab.label])), [['students', 'Alunos'], ['turmas', 'Turmas']]);
  assert.equal(board.valueText('xp', 4820), '4.820 XP');
  assert.equal(board.valueText('xp', 1), '1 XP');
  assert.equal(board.valueText('streak', 1), '1 dia');
  assert.equal(board.valueText('streak', 12), '12 dias');
  assert.equal(board.valueText('challenges', 1), '1 desafio');
  assert.equal(board.valueText('challenges', 1200), '1.200 desafios');
  assert.deepEqual(plain(board.valueParts('xp', 4820)), { number: '4.820', unit: 'XP' });
  assert.deepEqual(plain(board.valueParts('streak', 1)), { number: '1', unit: 'dia' });
  assert.deepEqual(plain(board.valueParts('challenges', 14)), { number: '14', unit: 'desafios' });
});

test('cabeçalho de colunas: aluno com nível; turma sem nível e com o valor em total', () => {
  assert.deepEqual(plain(board.boardHead('students', 'xp')), { who: 'Aluno', level: 'Nível', value: 'XP' });
  assert.deepEqual(plain(board.boardHead('students', 'streak')), { who: 'Aluno', level: 'Nível', value: 'Dias' });
  assert.deepEqual(plain(board.boardHead('turmas', 'challenges')), { who: 'Turma', level: '', value: 'Desafios (total)' });
});

test('normalização: aluno ganha valor e estatísticas; turma vira linha sem dados de aluno', () => {
  const legacy = board.toBoardEntry({ rankKey: 'a', position: 1, name: 'Ana', points: 90, level: 2 });
  assert.deepEqual(plain([legacy.kind, legacy.value, legacy.stats, legacy.studentCount]), ['student', 90, stats(90, 0, 0), null]);
  const row = board.toBoardEntry(turma(1, 2, 2980, { companyName: 'Colégio Ipê', mine: true }));
  assert.deepEqual(plain([row.kind, row.rankKey, row.position, row.points, row.value, row.level, row.companyName, row.isCurrentUser, row.studentCount, row.look]),
    ['turma', 't1', 2, 2980, 2980, 0, 'Colégio Ipê', true, 12, {}]);
  assert.equal(board.toBoardEntry(turma(1, null, 0)).position, 0);
  assert.equal(board.toBoardEntry(row), row);
  const wrapped = board.boardRanking(data({ unit: 'turmas', top: [turma(1, 1, 50)], leaderboard: [turma(1, 1, 50), turma(2, 2, 40)], currentUser: turma(2, 2, 40, { mine: true }) }));
  assert.deepEqual(plain(wrapped.leaderboard.map((entry) => entry.kind)), ['turma', 'turma']);
  assert.equal(wrapped.currentUser.isCurrentUser, true);
  assert.equal(wrapped.unit, 'turmas');
  assert.equal(board.boardRanking(data()).currentUser, null);
  assert.equal(board.categoryOf({}), 'xp');
  assert.equal(board.unitOf({}), 'students');
});

test('tendência da semana vem de weeklyChange; turma mostra "total da turma"', () => {
  const row = (change) => board.toBoardEntry(student(1, 1, 10, { weeklyChange: change }));
  assert.deepEqual(plain(board.rowTrend(row(2))), { text: '▲ 2 na semana', tone: 'up' });
  assert.deepEqual(plain(board.rowTrend(row(-3))), { text: '▼ 3 na semana', tone: 'down' });
  assert.equal(board.rowTrend(row(0)), null);
  assert.equal(board.rowTrend(row(null)), null);
  assert.equal(board.rowTrend(row(undefined)), null);
  assert.deepEqual(plain(board.rowTrend(board.toBoardEntry(turma(1, 1, 10)))), { text: 'total da turma', tone: 'plain' });
});

test('subtítulo: escola no global; turma com "N alunos", escola e "sua turma"', () => {
  const ana = board.toBoardEntry(student(1, 1, 10, { companyName: 'Colégio Ipê' }));
  assert.equal(board.rowSub(ana, true, false), 'Colégio Ipê');
  assert.equal(board.rowSub(ana, false, false), null);
  assert.equal(board.rowSub({ ...ana, companyName: null }, true, false), null);
  const sala = board.toBoardEntry(turma(1, 1, 10, { companyName: 'Colégio Ipê', studentCount: 34 }));
  assert.equal(board.rowSub(sala, false, false), '34 alunos');
  assert.equal(board.rowSub(sala, false, true), '34 alunos · sua turma');
  assert.equal(board.rowSub(sala, true, false), 'Colégio Ipê · 34 alunos');
  assert.equal(board.rowSub(board.toBoardEntry(turma(1, 1, 10, { studentCount: 1 })), false, false), '1 aluno');
});

test('chip da turma: ano e letra; sem ano, as iniciais', () => {
  assert.equal(board.turmaChip('7º ano B'), '7B');
  assert.equal(board.turmaChip('6º ano A'), '6A');
  assert.equal(board.turmaChip('9º ano'), '9');
  assert.equal(board.turmaChip('Turma Aurora'), 'TA');
  assert.equal(board.turmaChip('Robótica'), 'R');
  assert.equal(board.turmaChip(''), '');
});

test('placa do palco: as três estatísticas do período e a categoria ativa em destaque', () => {
  const ana = board.toBoardEntry(student(1, 1, 4820, { stats: stats(4820, 12, 18) }));
  const items = (mode, category) => plain(board.stageStats(ana, mode, category).map((item) => [item.key, item.label, item.text, item.on]));
  assert.deepEqual(items('current', 'xp'), [['xp', 'XP temporada', '4.820', true], ['streak', 'Sequência', '12 dias', false], ['challenges', 'Desafios', '18', false]]);
  assert.equal(items('season', 'xp')[0][1], 'XP final');
  assert.equal(items('total', 'xp')[0][1], 'XP total');
  assert.deepEqual(items('current', 'streak').map((item) => item[3]), [false, true, false]);
  assert.deepEqual(items('current', 'challenges').map((item) => item[3]), [false, false, true]);
  const sala = board.toBoardEntry(turma(1, 1, 900, { stats: stats(900, 41, 120) }));
  assert.deepEqual(plain(board.stageStats(sala, 'current', 'xp').map((item) => [item.label, item.text])),
    [['XP', '900'], ['Sequência', '41 dias'], ['Desafios', '120']]);
  assert.deepEqual(plain(board.stageStats(sala, 'current', 'xp').map((item) => item.short)), ['XP', 'Dias', 'Desafios']);
});

test('hall: pílula, selo e aviso por unidade e categoria; a cena inclui categoria e unidade', () => {
  const sala = board.toBoardEntry(turma(1, 2, 2980, { name: '7º ano B', studentCount: 34, companyName: 'Colégio Ipê' }));
  assert.equal(hall.hallPill(sala, false), '34 alunos');
  assert.equal(hall.hallPill(sala, true), 'Colégio Ipê');
  assert.deepEqual(plain(hall.hallBadge(2, 'company', 'current', 'students')), { number: '2º', caption: 'na sua escola' });
  assert.deepEqual(plain(hall.hallBadge(2, 'global', 'season', 'students')), { number: '2º', caption: 'entre todas as escolas · final' });
  assert.deepEqual(plain(hall.hallBadge(1, 'company', 'total', 'turmas')), { number: '1º', caption: 'entre as turmas da escola · geral' });
  assert.deepEqual(plain(hall.hallBadge(1, 'global', 'current', 'turmas')), { number: '1º', caption: 'entre todas as turmas' });
  assert.equal(hall.hallAnnouncement(sala, false, 'entre as turmas da escola', 'xp'), 'No palco: 7º ano B, 2º lugar entre as turmas da escola, 2.980 XP no total da turma.');
  assert.equal(hall.hallAnnouncement(sala, true, 'entre as turmas da escola'), 'No palco: sua turma, 7º ano B, 2º lugar entre as turmas da escola, 2.980 XP no total da turma.');
  const ana = board.toBoardEntry(student(1, 3, 12, { name: 'Ana' }));
  assert.equal(hall.hallAnnouncement(ana, true, 'na sua escola', 'streak'), 'No palco: você, 3º lugar na sua escola, 12 dias.');
  const base = data({ leaderboard: [student(1, 1, 5)] });
  const key = (patch) => hall.hallSceneKey(data({ leaderboard: [student(1, 1, 5)], ...patch }));
  assert.equal(hall.hallSceneKey(base), key({}));
  assert.notEqual(hall.hallSceneKey(base), key({ category: 'streak' }));
  assert.notEqual(hall.hallSceneKey(base), key({ unit: 'turmas' }));
  assert.equal(hall.hallSceneKey(data({ category: undefined, unit: undefined })), hall.hallSceneKey(base));
});

const CONTEXT = { management: false, seasonName: 'Temporada de Primavera' };
function barOf(input, selected = null, context = CONTEXT) {
  const current = board.boardRanking(input);
  return mine.mineBar(current, hall.hallEntries(current), selected, context);
}

test('barra "Seu ranking": faltam N para passar o vizinho, topo, período encerrado e sem posição', () => {
  const rows = [student(1, 1, 6000), student(2, 2, 5950), student(3, 3, 5904, { isCurrentUser: true }), student(4, 4, 5000)];
  const input = (patch = {}) => data({
    leaderboard: rows, currentUser: rows[2], viewerParticipates: true, totalParticipants: 4,
    summary: { leaderPoints: 6000, pointsBehindLeader: 96, pointsToNextPosition: 47, percentile: 50 }, ...patch,
  });
  const viewer = barOf(input());
  assert.deepEqual(plain([viewer.variant, viewer.label, viewer.position, viewer.id, viewer.onStage, viewer.cta]), ['viewer', 'Seu ranking', '3º', 'k3', false, true]);
  assert.equal(viewer.text, '5.904 XP · faltam 47 XP para passar Aluno 2 e chegar ao 2º.');
  assert.equal(barOf(input(), 'k3').onStage, true);
  assert.equal(barOf(input({ mode: 'season' })).cta, false);
  assert.equal(barOf(input({ mode: 'season' })).text, '5.904 XP · posição final na Temporada de Primavera.');
  assert.equal(barOf(input({ currentUser: { ...rows[0], isCurrentUser: true } })).text, '6.000 XP · você está no topo! Continue estudando para manter o lugar.');
  const far = { leaderPoints: 6000, pointsBehindLeader: 96, pointsToNextPosition: 400, percentile: 50 };
  assert.equal(barOf(input({ summary: far })).text, '5.904 XP · faltam 400 XP para subir uma posição.');
  assert.equal(barOf(input({ summary: { ...far, pointsToNextPosition: null } })).text, '5.904 XP');
  const outside = input({ leaderboard: rows.map((row) => ({ ...row, isCurrentUser: false })), currentUser: student(9, 73, 120, { isCurrentUser: true }), totalParticipants: 140, summary: { ...far, pointsToNextPosition: 20 } });
  assert.equal(barOf(outside).text, '120 XP · faltam 20 XP para subir uma posição.');
  assert.equal(barOf(outside).position, '73º');
});

test('barra por categoria: sequência e desafios falam em dias e desafios', () => {
  const rows = [student(1, 1, 20), student(2, 2, 15, { isCurrentUser: true })];
  const input = (category, patch = {}) => data({
    category, leaderboard: rows, currentUser: rows[1], viewerParticipates: true, totalParticipants: 2,
    summary: { leaderPoints: 20, pointsBehindLeader: 5, pointsToNextPosition: 6, percentile: 50 }, ...patch,
  });
  assert.equal(barOf(input('streak')).text, '15 dias · faltam 6 dias para passar Aluno 1 e chegar ao 1º.');
  assert.equal(barOf(input('challenges')).text, '15 desafios · faltam 6 desafios para passar Aluno 1 e chegar ao 1º.');
  assert.equal(barOf(input('streak', { currentUser: { ...rows[0], isCurrentUser: true } })).text, '20 dias · você está no topo! Continue estudando para manter o lugar.');
});

test('barra sem participação e visão de gestão', () => {
  const rows = [student(1, 1, 10)];
  const absent = barOf(data({ leaderboard: rows, viewerParticipates: true, currentUser: null }));
  assert.deepEqual(plain([absent.variant, absent.position, absent.id, absent.cta]), ['absent', '—', null, true]);
  assert.equal(absent.text, 'Você não aparece nesta classificação: não houve participação neste período.');
  const zero = barOf(data({ leaderboard: rows, viewerParticipates: true, currentUser: student(7, 0, 0, { points: 0, isCurrentUser: true }) }));
  assert.deepEqual(plain([zero.variant, zero.position, zero.id, zero.cta]), ['absent', '—', null, true]);
  assert.equal(zero.text, 'Você ainda não tem XP nesta temporada. A primeira aula já coloca você no placar.');
  const manager = { management: true, seasonName: 'x' };
  const admin = barOf(data({ leaderboard: rows, viewerParticipates: false, totalParticipants: 3000 }), null, manager);
  assert.deepEqual(plain([admin.variant, admin.label, admin.position, admin.id, admin.cta]), ['manage', 'Visão de gestão', '3.000', null, false]);
  assert.equal(admin.text, 'alunos nesta classificação. Você acompanha sem participar: professores e gestores não entram na disputa.');
  assert.equal(barOf(data({ unit: 'turmas', totalParticipants: 1 }), null, manager).text.startsWith('turma nesta classificação'), true);
  assert.equal(barOf(data({ viewerParticipates: false, currentUser: rows[0], leaderboard: rows }), null, CONTEXT).variant, 'absent');
});

test('barra "Sua turma": posição, total da turma e quem lidera', () => {
  const rows = [turma(1, 1, 3000), turma(2, 2, 1985, { name: '7º ano B', mine: true }), turma(3, 3, 900)];
  const input = (patch = {}) => data({ unit: 'turmas', leaderboard: rows, currentUser: rows[1], viewerParticipates: true, totalParticipants: 3, ...patch });
  const own = barOf(input());
  assert.deepEqual(plain([own.variant, own.label, own.position, own.id, own.entry.kind]), ['turma', 'Sua turma', '2º', 't2', 'turma']);
  assert.equal(own.text, '7º ano B · 1.985 XP no total da turma.');
  assert.equal(barOf(input({ currentUser: { ...rows[0], mine: true } })).text, 'Turma 1 · 3.000 XP no total da turma. Sua turma lidera!');
  assert.equal(barOf(input({ category: 'streak' })).text, '7º ano B · 1.985 dias no total da turma.');
  const none = barOf(input({ currentUser: null }));
  assert.deepEqual(plain([none.variant, none.label, none.position]), ['absent', 'Sua turma', '—']);
  assert.equal(none.text, 'Você ainda não está em uma turma.');
  assert.equal(barOf(input({ currentUser: turma(2, null, 0, { mine: true }) })).variant, 'absent');
});

test('trio da turma: três cores da paleta, fixas por turma e sem repetir', () => {
  const trio = board.trioTones('t-abc');
  assert.equal(trio.length, 3);
  assert.equal(new Set(trio).size, 3);
  assert.deepEqual(plain(board.trioTones('t-abc')), plain(trio));
  assert.ok(trio.every((tone) => /^var\(--sp-(blue|orange|pink|red)\)$/.test(tone)));
  assert.notDeepEqual(plain(board.trioTones('t-abc')), plain(board.trioTones('t-xyz-9')));
});

test('rótulo da linha pela categoria e pela turma do aluno', () => {
  const sala = board.toBoardEntry(turma(1, 2, 1985, { name: '7º ano B' }));
  assert.equal(scoreboard.scoreboardRowLabel(sala, { me: false, onStage: false, category: 'streak' }), '2º lugar, 7º ano B, 1.985 dias no total da turma. Levar ao palco');
  assert.equal(scoreboard.scoreboardRowLabel(sala, { me: true, onStage: true }), '2º lugar, 7º ano B, sua turma, 1.985 XP no total da turma. No palco');
  const ana = board.toBoardEntry(student(1, 1, 7, { name: 'Ana' }));
  assert.equal(scoreboard.scoreboardRowLabel(ana, { me: false, onStage: false, category: 'challenges' }), '1º lugar, Ana, nível 3, 7 desafios. Levar ao palco');
});

test('cartão do placar: categoria e unidade da resposta, subtítulo e corte', () => {
  const fallback = { category: 'streak', unit: 'turmas' };
  assert.deepEqual(plain(scoreboard.scoreboardView(null, fallback)), { category: 'streak', unit: 'turmas', showCompany: false, subtitle: 'Minha escola', participants: 0, listed: 0 });
  const one = scoreboard.scoreboardView(data({ totalParticipants: 1, leaderboard: [student(1, 1, 5)] }), fallback);
  assert.deepEqual(plain([one.category, one.unit, one.showCompany, one.subtitle, one.listed]), ['xp', 'students', false, 'Escola · 1 participante', 1]);
  const global = scoreboard.scoreboardView(data({ scope: 'global', unit: 'turmas', category: 'challenges', totalParticipants: 3000, top: [turma(1, 1, 5)] }), fallback);
  assert.deepEqual(plain([global.category, global.unit, global.showCompany, global.subtitle, global.participants, global.listed]), ['challenges', 'turmas', true, 'Todas as escolas · 3.000 turmas', 3000, 1]);
  assert.equal(scoreboard.scoreboardView(data({ company: null, totalParticipants: 2 }), fallback).subtitle, 'Minha escola · 2 participantes');
});

test('palco: nome do botão de cutucar e classes com a cortina fechando', () => {
  const ana = board.toBoardEntry(student(1, 1, 5, { name: 'Ana' }));
  assert.equal(hall.hallPokeLabel(ana, true), 'Cutucar o seu personagem');
  assert.equal(hall.hallPokeLabel(ana, false), 'Cutucar o personagem de Ana');
  assert.equal(hall.hallPokeLabel(board.toBoardEntry(turma(1, 1, 5, { name: '7º ano B' })), false), 'Cutucar os personagens da turma 7º ano B');
  const theme = hall.hallTheme(undefined);
  assert.equal(hall.hallStageClass(1, theme, { lit: true }).includes('is-covered'), false);
  assert.equal(hall.hallStageClass(1, theme, { lit: false, covered: true }).includes('is-covered'), true);
  assert.equal(hall.hallStageClass(1, theme, { lit: true }).includes('is-lit'), true);
});

test('fases da cortina: só aberta o elenco é tocável; fechando, ele fica montado atrás dela', () => {
  const flags = (phase) => plain(hall.stageFlags(phase));
  assert.deepEqual(flags('closed'), { mounted: false, live: false, steps: false, announce: false });
  assert.deepEqual(flags('opening'), { mounted: true, live: false, steps: true, announce: true });
  assert.deepEqual(flags('open'), { mounted: true, live: true, steps: true, announce: true });
  assert.deepEqual(flags('closing'), { mounted: true, live: false, steps: false, announce: false });
  assert.equal(hall.hallTrio(board.toBoardEntry(student(1, 1, 5))), null);
  assert.equal(hall.hallTrio(board.toBoardEntry(turma(1, 1, 5))).length, 3);
});

test('unidade dos destaques da semana no singular quando o valor é 1', () => {
  assert.equal(board.unitFor(1, 'dias'), 'dia');
  assert.equal(board.unitFor(1, 'desafios'), 'desafio');
  assert.equal(board.unitFor(2, 'dias'), 'dias');
  assert.equal(board.unitFor(1, 'XP'), 'XP');
  assert.equal(board.unitFor(0, 'desafios'), 'desafios');
});

test('destaques da semana: só na temporada atual, em XP e entre alunos', () => {
  assert.equal(board.showsWeeklyHighlights(data()), true);
  assert.equal(board.showsWeeklyHighlights(data({ category: undefined, unit: undefined })), true);
  assert.equal(board.showsWeeklyHighlights(data({ mode: 'total' })), false);
  assert.equal(board.showsWeeklyHighlights(data({ mode: 'season' })), false);
  assert.equal(board.showsWeeklyHighlights(data({ category: 'streak' })), false);
  assert.equal(board.showsWeeklyHighlights(data({ unit: 'turmas' })), false);
});

test('aluno com zero na categoria: o texto explica o zero, sem dizer que não participou', () => {
  const rows = [student(1, 1, 10)];
  const zeroOf = (patch) => barOf(data({ leaderboard: rows, viewerParticipates: true, currentUser: student(7, null, 0, { points: 0, isCurrentUser: true }), ...patch }));
  assert.equal(zeroOf({}).text, 'Você ainda não tem XP nesta temporada. A primeira aula já coloca você no placar.');
  assert.equal(zeroOf({ mode: 'total' }).text, 'Você ainda não tem XP.');
  assert.equal(zeroOf({ mode: 'season' }).text, 'Você não teve XP neste período.');
  assert.equal(zeroOf({ category: 'streak' }).text, 'Ainda sem sequência de acesso neste período.');
  assert.equal(zeroOf({ category: 'challenges' }).text, 'Nenhum desafio concluído neste período.');
  assert.equal(zeroOf({ mode: 'season' }).cta, false);
  assert.equal(zeroOf({}).cta, true);
  assert.equal(zeroOf({ category: 'streak' }).variant, 'absent');
});

test('turmas com zero ou sem turma: dois textos diferentes', () => {
  const rows = [turma(1, 1, 50)];
  const zero = barOf(data({ unit: 'turmas', leaderboard: rows, viewerParticipates: true, currentUser: turma(2, null, 0, { mine: true }) }));
  assert.deepEqual(plain([zero.variant, zero.label, zero.position, zero.cta]), ['absent', 'Sua turma', '—', true]);
  assert.equal(zero.text, 'Sua turma ainda não pontuou neste período.');
  const none = barOf(data({ unit: 'turmas', leaderboard: rows, viewerParticipates: true, currentUser: null }));
  assert.equal(none.text, 'Você ainda não está em uma turma.');
  assert.equal(none.cta, true);
  assert.equal(barOf(data({ unit: 'turmas', leaderboard: rows, viewerParticipates: true, currentUser: null, mode: 'season' })).cta, false);
});

test('rótulos das setas: aluno ou turma', () => {
  assert.equal(hall.hallStepLabel('Bia', -1), 'Levar ao palco o aluno anterior: Bia');
  assert.equal(hall.hallStepLabel('7º ano B', -1, true), 'Levar ao palco a turma anterior: 7º ano B');
  assert.equal(hall.hallStepLabel('7º ano C', 1, true), 'Levar ao palco a próxima turma: 7º ano C');
  assert.equal(hall.hallStepLabel(null, 1, true), 'Não há próxima turma');
  assert.equal(hall.hallStepLabel(null, -1, true), 'Não há turma anterior');
});

test('rótulo da linha: nível e tendência da semana quando existem', () => {
  const up = board.toBoardEntry(student(1, 2, 4820, { name: 'Ana', level: 14, weeklyChange: 2 }));
  assert.equal(scoreboard.scoreboardRowLabel(up, { me: false, onStage: false }), '2º lugar, Ana, nível 14, 4.820 XP, subiu 2 posições na semana. Levar ao palco');
  const down = board.toBoardEntry(student(1, 2, 4820, { name: 'Ana', level: 14, weeklyChange: -1 }));
  assert.equal(scoreboard.scoreboardRowLabel(down, { me: false, onStage: false }), '2º lugar, Ana, nível 14, 4.820 XP, caiu 1 posição na semana. Levar ao palco');
  const still = board.toBoardEntry(student(1, 2, 4820, { name: 'Ana', level: 14, weeklyChange: 0 }));
  assert.equal(scoreboard.scoreboardRowLabel(still, { me: false, onStage: false, showCompany: true }), '2º lugar, Ana, nível 14, 4.820 XP. Levar ao palco');
  assert.equal(board.trendSpeech(up), 'subiu 2 posições na semana');
  assert.equal(board.trendSpeech(board.toBoardEntry(turma(1, 1, 5))), null);
});
