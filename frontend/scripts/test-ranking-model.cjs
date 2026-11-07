const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

const model = load('src/components/sections/HomePage/Ranking/rankingModel.ts', {});
const avatar = load('src/components/sections/HomePage/Ranking/rankingAvatarTone.ts', {});
const plain = (value) => JSON.parse(JSON.stringify(value));

const entry = (id, position, points, extra = {}) => ({ id, position, name: `Aluno ${id}`, points, level: 1, ...extra });

function ranking(overrides = {}) {
  return {
    mode: 'current', metric: 'seasonXp', selectedSeason: '2026-11', availableSeasons: [], dataCompleteness: 'complete',
    scope: 'company', companyAvailable: true, company: { id: 1, name: 'Escola' }, totalParticipants: 0,
    top: [], leaderboard: [], currentUser: null, viewerParticipates: false, weeklyHighlights: [],
    summary: { leaderPoints: 0, pointsBehindLeader: null, pointsToNextPosition: null, percentile: null },
    ...overrides,
  };
}

/** Lista ordenada como a API: empates dividem a posição (1, 2, 2, 4). */
function board(points) {
  let position = 0;
  let previous = null;
  return points.map((value, index) => {
    if (value !== previous) { position = index + 1; previous = value; }
    return entry(index + 1, position, value);
  });
}

test('prazo da temporada atual vem do endsAt do backend; sem data, do mês civil corrente', () => {
  const season = { name: 'Temporada 3', startsAt: '2026-11-01T00:00:00-03:00', endsAt: '2026-12-01T00:00:00-03:00', status: 'active' };
  const band = model.seasonBand(season, 'current', new Date(2026, 10, 4, 15));
  assert.equal(band.name, 'Temporada 3');
  assert.equal(band.daysLeft, 26);
  assert.equal(band.when, 'Termina em 30/11 · faltam 26 dias');
  assert.equal(model.seasonBand(season, 'current', new Date(2026, 10, 30, 23)).when, 'Termina hoje, 30/11');
  assert.equal(model.seasonBand(season, 'current', new Date(2026, 10, 29, 8)).when, 'Termina amanhã, 30/11');
  const fallback = model.seasonBand(null, 'current', new Date(2028, 1, 10));
  assert.equal(fallback.when, 'Termina em 29/02 · faltam 19 dias');
  assert.equal(fallback.name, 'Temporada atual');
});

test('temporada encerrada mostra a data final e Total não tem prazo', () => {
  const closed = { id: '2026-10', name: 'Temporada 2', startsAt: '2026-10-01T00:00:00-03:00', endsAt: '2026-11-01T00:00:00-03:00', status: 'closed', completeness: 'complete' };
  const band = model.seasonBand(null, 'season', new Date(2026, 10, 4), closed);
  assert.deepEqual({ name: band.name, when: band.when, daysLeft: band.daysLeft }, { name: 'Temporada 2', when: 'Encerrada em 31/10', daysLeft: null });
  assert.equal(model.seasonBand(null, 'total').daysLeft, null);
  assert.equal(model.completenessLabel('partial'), 'parcial');
});

test('pódio respeita empates do backend: 1º, 2º, 2º dividem número e degrau, na ordem visual 2-1-3', () => {
  const list = board([900, 700, 700, 500]);
  const slots = model.podiumSlots(ranking({ leaderboard: list, top: list.slice(0, 3), totalParticipants: 4 }));
  assert.deepEqual(slots.map((slot) => [slot.entry.position, slot.step, slot.order]), [[1, 1, 2], [2, 2, 1], [2, 2, 3]]);
  const tiedTop = board([800, 800, 800]);
  assert.deepEqual(model.podiumSlots(ranking({ leaderboard: tiedTop })).map((slot) => slot.step), [1, 1, 1]);
});

test('corrida: você ±2 da lista recebida e "faltam X XP para passar" só quando a distância bate com o backend', () => {
  const list = board([1000, 900, 800, 700, 600, 500, 400]);
  const me = { ...list[3], isCurrentUser: true };
  list[3] = me;
  const data = ranking({ leaderboard: list, totalParticipants: 7, currentUser: me, viewerParticipates: true, summary: { leaderPoints: 1000, pointsBehindLeader: 300, pointsToNextPosition: 101, percentile: 50 } });
  const race = model.raceModel(data);
  assert.deepEqual(race.lanes.map((lane) => lane.entry.position), [2, 3, 4, 5, 6]);
  assert.equal(race.lanes.find((lane) => lane.me).entry.id, me.id);
  assert.equal(race.chase.kind, 'neighbor');
  assert.equal(race.chase.gap, 101);
  assert.equal(race.chase.neighbor.id, 3);
  const mismatch = model.raceModel({ ...data, summary: { ...data.summary, pointsToNextPosition: 40 } });
  assert.equal(mismatch.chase.kind, 'gap');
  const first = model.raceModel({ ...data, currentUser: { ...list[0], isCurrentUser: true }, leaderboard: list.map((item, index) => ({ ...item, isCurrentUser: index === 0 })), summary: { ...data.summary, pointsToNextPosition: 0 } });
  assert.deepEqual(first.lanes.map((lane) => lane.entry.position), [1, 2, 3, 4, 5]);
  assert.equal(first.chase.kind, 'leader');
});

test('abaixo da 50ª: sua linha depois de "· · ·", corrida só com o resumo em XP e sem nomes', () => {
  const list = Array.from({ length: 50 }, (_, index) => entry(index + 1, index + 1, 5000 - index * 10));
  const me = entry(999, 73, 120, { isCurrentUser: true });
  const data = ranking({ leaderboard: list, top: list.slice(0, 3), totalParticipants: 140, currentUser: me, viewerParticipates: true, summary: { leaderPoints: 5000, pointsBehindLeader: 4880, pointsToNextPosition: 6, percentile: 48 } });
  const rows = model.boardModel(data);
  assert.equal(rows.viewerOutside.id, 999);
  assert.equal(rows.rows.length, 47);
  assert.equal(rows.truncated, true);
  assert.ok(rows.rows.every((row) => !row.me));
  const race = model.raceModel(data);
  assert.equal(race.inList, false);
  assert.deepEqual(plain(race.lanes), []);
  assert.deepEqual(plain(race.chase), { kind: 'gap', gap: 6 });
});

test('gestão vê sem participar: sem corrida, sem linha "Você" e só falas de acompanhamento', () => {
  const list = board([300, 200, 100, 50]);
  const data = ranking({ leaderboard: list, totalParticipants: 4, currentUser: null, viewerParticipates: false, summary: { leaderPoints: 300, pointsBehindLeader: null, pointsToNextPosition: null, percentile: null } });
  assert.equal(model.raceModel(data), null);
  assert.equal(model.boardModel(data).viewerOutside, null);
  assert.ok(model.podiumSlots(data).every((slot) => !slot.me));
  assert.equal(model.isManagementRole('admin'), true);
  assert.equal(model.isManagementRole('platform_admin'), true);
  assert.equal(model.isManagementRole('user'), false);
  const speech = model.hostSpeech({ band: model.seasonBand(null, 'current', new Date(2026, 10, 4)), race: null, management: true, participants: 4, highlight: null });
  assert.equal(speech.idle, 'Quem está mandando bem?');
  assert.ok(speech.lines.includes('4 alunos nesta classificação.'));
});

test('Global só para empresa que liga e conta que não é trial; sem instituição começa no Global', () => {
  assert.deepEqual(plain(model.scopeOptions(true, false)), ['company', 'global']);
  assert.deepEqual(plain(model.scopeOptions(true, true)), ['company']);
  assert.deepEqual(plain(model.scopeOptions(false, false)), ['company']);
  assert.equal(model.defaultScope(['company', 'global'], true), 'company');
  assert.equal(model.defaultScope(['company', 'global'], false), 'global');
  assert.equal(model.defaultScope(['company'], false), 'company');
});

test('temporada encerrada e começo da temporada têm mensagens próprias; falas não chamam para jogar', () => {
  const me = entry(5, 2, 0, { isCurrentUser: true });
  const start = model.raceModel(ranking({ leaderboard: [entry(1, 1, 0), me].map((item) => ({ ...item, position: 1 })), currentUser: { ...me, position: 1 }, viewerParticipates: true, totalParticipants: 2, summary: { leaderPoints: 0, pointsBehindLeader: 0, pointsToNextPosition: 0, percentile: 100 } }));
  assert.equal(start.chase.kind, 'start');
  const final = model.raceModel(ranking({ mode: 'season', leaderboard: [entry(1, 1, 50), me], currentUser: me, viewerParticipates: true, totalParticipants: 2, summary: { leaderPoints: 50, pointsBehindLeader: 50, pointsToNextPosition: 51, percentile: 0 } }));
  assert.deepEqual(plain(final.chase), { kind: 'final', position: 2 });
  const speech = model.hostSpeech({ band: model.seasonBand(null, 'current', new Date(2026, 10, 4)), race: final, management: false, participants: 2, highlight: { kind: 'streak', name: 'Lua', value: 9 } });
  assert.ok(speech.lines.includes('Lua está com 9 dias seguidos!'));
  assert.ok(speech.lines.every((line) => !/jog/i.test(line)));
});

test('avatar sem foto: cor fixa pelo id e amarelo para você', () => {
  assert.deepEqual(avatar.avatarTone(12, false), avatar.avatarTone(12, false));
  assert.notDeepEqual(avatar.avatarTone(12, false), avatar.avatarTone(13, false));
  assert.equal(avatar.avatarTone(12, true).background, 'var(--sp-yellow)');
  assert.equal(avatar.avatarTone(12, true).color, 'var(--sp-black)');
});

test('sua foto do perfil completa só as suas linhas sem foto, sem mudar posição nem XP', () => {
  const me = entry(5, 2, 40, { isCurrentUser: true, profileImageUrl: null });
  const other = entry(1, 1, 90);
  const withPhoto = entry(7, 3, 10, { profileImageUrl: 'https://cdn/7.png' });
  const data = ranking({
    leaderboard: [other, me, withPhoto], top: [other, me, withPhoto], currentUser: { ...me, isCurrentUser: undefined },
    viewerParticipates: true, totalParticipants: 3,
    weeklyHighlights: [{ kind: 'xp', label: 'Mais XP', user: { ...me }, value: 40, unit: 'XP' }],
  });
  const filled = avatar.withViewerPhoto(data, ' https://cdn/me.png ');
  assert.equal(filled.leaderboard[1].profileImageUrl, 'https://cdn/me.png');
  assert.equal(filled.currentUser.profileImageUrl, 'https://cdn/me.png');
  assert.equal(filled.weeklyHighlights[0].user.profileImageUrl, 'https://cdn/me.png');
  assert.equal(filled.leaderboard[0].profileImageUrl, undefined);
  assert.equal(filled.leaderboard[2].profileImageUrl, 'https://cdn/7.png');
  assert.deepEqual(filled.leaderboard.map((item) => [item.position, item.points]), [[1, 90], [2, 40], [3, 10]]);
  // Foto já enviada pelo ranking prevalece; sem foto no perfil, nada muda.
  const sent = ranking({ leaderboard: [{ ...me, profileImageUrl: 'https://cdn/sent.png' }], currentUser: me });
  assert.equal(avatar.withViewerPhoto(sent, 'https://cdn/me.png').leaderboard[0].profileImageUrl, 'https://cdn/sent.png');
  assert.equal(avatar.withViewerPhoto(data, null), data);
  assert.equal(avatar.withViewerPhoto(data, '  '), data);
});

test('semana: setas e rótulos acessíveis, traço quando não há dados', () => {
  assert.deepEqual(plain(model.trendOf(2, true)), { text: '▲ 2', label: 'subiu 2 posições na semana', tone: 'up' });
  assert.equal(model.trendOf(-1, true).label, 'caiu 1 posição na semana');
  assert.equal(model.trendOf(3, false).tone, 'none');
  assert.equal(model.weeklyLine(null), null);
});

test('fora da lista exibida (abaixo da 50ª) a corrida não nomeia ninguém, mesmo se a distância bater', () => {
  const list = board(Array.from({ length: 50 }, (_, index) => 2000 - index * 10));
  const last = list[49];
  const me = entry(999, 51, last.points - 30, { isCurrentUser: true });
  const data = ranking({ leaderboard: list, totalParticipants: 80, currentUser: me, viewerParticipates: true, summary: { leaderPoints: 2000, pointsBehindLeader: 2000 - me.points, pointsToNextPosition: 31, percentile: 30 } });
  const race = model.raceModel(data);
  assert.equal(race.inList, false);
  assert.deepEqual(plain(race.lanes), []);
  assert.deepEqual(plain(race.chase), { kind: 'gap', gap: 31 });
});

test('sua linha fora da lista usa a variação semanal do aluno (weeklyPositionChange)', () => {
  const list = board([900, 800, 700, 600]);
  const me = entry(999, 73, 120, { isCurrentUser: true });
  const data = ranking({ leaderboard: list, totalParticipants: 80, currentUser: me, viewerParticipates: true, weeklyPositionChange: 2 });
  assert.equal(model.boardModel(data).viewerOutside.weeklyChange, 2);
  assert.equal(model.boardModel({ ...data, weeklyPositionChange: undefined }).viewerOutside.weeklyChange, null);
});
