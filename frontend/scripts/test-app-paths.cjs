const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

const m = load('src/lib/appPaths.ts', {});
const plain = (value) => JSON.parse(JSON.stringify(value));

test('slugify gera texto de URL sem acento, sem ponto e sem hifen nas pontas', () => {
  assert.equal(m.slugify('Senhas Fortes & Seguras!'), 'senhas-fortes-e-seguras');
  assert.equal(m.slugify('Ação Ç ã ª'), 'acao-c-a-a');
  assert.equal(m.slugify('  --Phishing: reconheça--  '), 'phishing-reconheca');
  assert.equal(m.slugify('v1.2.3 da lição'), 'v1-2-3-da-licao');
  assert.equal(m.slugify(''), '');
  assert.equal(m.slugify(null), '');
  assert.equal(m.slugify(undefined), '');
  assert.equal(m.slugify('🔐🎮'), '');
  for (const title of ['Ponto.final', 'a/b?c#d', 'x . y', '..', 'Olá, mundo.']) {
    assert.doesNotMatch(m.slugify(title), /[./?#%\s]/);
  }
});

test('slugify corta em 60 sem hifen final, preferindo palavra inteira', () => {
  const words = 'palavra '.repeat(20);
  const cut = m.slugify(words);
  assert.ok(cut.length <= 60);
  assert.ok(!cut.endsWith('-'));
  assert.match(cut, /^(palavra-)*palavra$/);
  // Sem fronteira util depois da metade: corte seco.
  const solid = m.slugify('a'.repeat(80));
  assert.equal(solid, 'a'.repeat(60));
  // Corte que cai exatamente numa fronteira nao deixa hifen sobrando.
  const exact = `${'b'.repeat(59)} cccc`;
  assert.equal(m.slugify(exact), 'b'.repeat(59));
  assert.equal(m.slugify('abcdef ghij', 6), 'abcdef');
  assert.ok(!m.slugify('abc-def-ghi', 8).endsWith('-'));
});

test('contentSegment junta ID e slug, ou so o ID quando nao ha titulo aproveitavel', () => {
  assert.equal(m.contentSegment(8, 'Senhas Fortes'), '8-senhas-fortes');
  assert.equal(m.contentSegment(8), '8');
  assert.equal(m.contentSegment(8, null), '8');
  assert.equal(m.contentSegment(8, '🔐'), '8');
});

test('parseContentSegment aceita so inteiros positivos no inicio e ignora o slug', () => {
  assert.equal(m.parseContentSegment('8'), 8);
  assert.equal(m.parseContentSegment('8-x'), 8);
  assert.equal(m.parseContentSegment('8-Seguranç'), 8);
  assert.equal(m.parseContentSegment('08'), 8);
  assert.equal(m.parseContentSegment('0'), null);
  assert.equal(m.parseContentSegment('0-x'), null);
  assert.equal(m.parseContentSegment('8x'), null);
  assert.equal(m.parseContentSegment('abc'), null);
  assert.equal(m.parseContentSegment('-8'), null);
  assert.equal(m.parseContentSegment(''), null);
  assert.equal(m.parseContentSegment(undefined), null);
  assert.equal(m.parseContentSegment('99999999999999999999'), null);
  assert.equal(m.parseContentSegment('12345678901'), null);
});

test('paths monta os caminhos canonicos', () => {
  assert.equal(m.paths.inicio(), '/inicio');
  assert.equal(m.paths.aprender(), '/aprender');
  assert.equal(m.paths.aprenderModulo({ id: 8, title: 'Senhas Fortes' }), '/aprender/8-senhas-fortes');
  assert.equal(m.paths.aprenderModulo({ id: 8 }), '/aprender/8');
  assert.equal(m.paths.aprenderAula({ id: 8, title: 'Senhas Fortes' }, { id: 47, title: 'Crie uma frase-senha' }), '/aprender/8-senhas-fortes/47-crie-uma-frase-senha');
  assert.equal(m.paths.aprenderAula({ id: 8, title: null }, { id: 47 }), '/aprender/8/47');
  assert.equal(m.paths.jogos(), '/jogos');
  assert.equal(m.paths.ranking(), '/ranking');
  assert.equal(m.paths.conquistas(), '/conquistas');
  assert.equal(m.paths.colecionaveis(), '/conquistas?aba=colecionaveis');
  assert.equal(m.paths.perfil(), '/perfil');
  assert.equal(m.STUDENT_HOME_PATH, '/inicio');
});

test('studentSectionPath traduz o ID interno da secao para o segmento da URL', () => {
  assert.equal(m.studentSectionPath('dashboard'), '/inicio');
  assert.equal(m.studentSectionPath('conteudos'), '/aprender');
  assert.equal(m.studentSectionPath('desafios'), '/jogos');
  assert.equal(m.studentSectionPath('ranking'), '/ranking');
  assert.equal(m.studentSectionPath('conquistas'), '/conquistas');
  assert.equal(m.studentSectionPath('perfil'), '/perfil');
  assert.equal(m.studentSectionPath('conteudos', null), '/aprender');
  assert.equal(m.studentSectionPath('conteudos', { moduloId: 8 }), '/aprender/8');
  assert.equal(m.studentSectionPath('conteudos', { moduloId: 8, aulaId: 47 }), '/aprender/8/47');
  // Mantem o slug que ja esta na URL.
  assert.equal(m.studentSectionPath('conteudos', { moduloId: 8, aulaId: 47, moduloSegment: '8-senhas-fortes' }), '/aprender/8-senhas-fortes/47');
  // Alvo so vale em conteudos.
  assert.equal(m.studentSectionPath('ranking', { moduloId: 8 }), '/ranking');
  // Segmento vindo da URL (ja decodificado) nao pode quebrar o caminho.
  assert.equal(m.studentSectionPath('conteudos', { moduloId: 8, moduloSegment: '8-a?b#c/d' }), '/aprender/8-a%3Fb%23c%2Fd');
});

test('parseStudentPath reconhece as rotas novas do aluno', () => {
  const at = (path) => plain(m.parseStudentPath(path));
  const base = { moduloRaw: null, aulaRaw: null, moduloId: null, aulaId: null };
  assert.deepEqual(at('/inicio'), { section: 'dashboard', ...base });
  assert.deepEqual(at('/aprender'), { section: 'conteudos', ...base });
  assert.deepEqual(at('/jogos'), { section: 'desafios', ...base });
  assert.deepEqual(at('/ranking'), { section: 'ranking', ...base });
  assert.deepEqual(at('/conquistas'), { section: 'conquistas', ...base });
  assert.deepEqual(at('/perfil'), { section: 'perfil', ...base });
  assert.deepEqual(at('/aprender/8-senhas-fortes'), { section: 'conteudos', moduloRaw: '8-senhas-fortes', aulaRaw: null, moduloId: 8, aulaId: null });
  assert.deepEqual(at('/aprender/8'), { section: 'conteudos', moduloRaw: '8', aulaRaw: null, moduloId: 8, aulaId: null });
  assert.deepEqual(at('/aprender/8-senhas-fortes/47-frase-senha'), { section: 'conteudos', moduloRaw: '8-senhas-fortes', aulaRaw: '47-frase-senha', moduloId: 8, aulaId: 47 });
});

test('parseStudentPath aceita barra final e marca segmentos invalidos sem inventar IDs', () => {
  assert.equal(m.parseStudentPath('/inicio/').section, 'dashboard');
  assert.equal(m.parseStudentPath('/aprender/').section, 'conteudos');
  assert.equal(m.parseStudentPath('/aprender/8-x/').moduloId, 8);
  const invalid = plain(m.parseStudentPath('/aprender/abc/47'));
  assert.equal(invalid.moduloRaw, 'abc');
  assert.equal(invalid.moduloId, null);
  assert.equal(invalid.aulaId, 47);
  const badLesson = plain(m.parseStudentPath('/aprender/8-x/zzz'));
  assert.equal(badLesson.moduloId, 8);
  assert.equal(badLesson.aulaRaw, 'zzz');
  assert.equal(badLesson.aulaId, null);
  // Slug com acento chega codificado e e decodificado.
  assert.equal(m.parseStudentPath('/aprender/8-seguran%C3%A7a').moduloRaw, '8-segurança');
  // Percent-encoding malformado nao lanca.
  assert.equal(m.parseStudentPath('/aprender/8-%E0%A4%A').moduloId, 8);
});

test('parseStudentPath devolve null para o que nao e rota do aluno', () => {
  for (const path of ['/jogos/x', '/inicio/x', '/ranking/1', '/perfil/a/b', '/aprender/1/2/3', '/home', '/home/ranking', '/admin/inicio', '/login', '/', '/xyz', '/Inicio', '/inicio-x', '/aprenderx', '']) {
    assert.equal(m.parseStudentPath(path), null, path);
  }
});

test('isStudentAreaPath cobre as rotas novas e o prefixo legado /home', () => {
  for (const path of ['/inicio', '/aprender', '/aprender/8-x/47', '/jogos', '/ranking', '/conquistas', '/perfil', '/home', '/home/', '/home/conteudos/8', '/home/qualquer']) {
    assert.equal(m.isStudentAreaPath(path), true, path);
  }
  for (const path of ['/', '/login', '/admin/inicio', '/cadastro', '/homepage', '/homex/y', '/xyz', '/jogos/x']) {
    assert.equal(m.isStudentAreaPath(path), false, path);
  }
});

test('legacyHomeTarget leva cada /home antigo ao caminho novo', () => {
  const cases = [
    ['/home', '/inicio'],
    ['/home/', '/inicio'],
    ['/home/dashboard', '/inicio'],
    ['/home/conteudos', '/aprender'],
    ['/home/conteudos/8', '/aprender/8'],
    ['/home/conteudos/8/47', '/aprender/8/47'],
    ['/home/desafios', '/jogos'],
    ['/home/ranking', '/ranking'],
    ['/home/conquistas', '/conquistas'],
    ['/home/perfil', '/perfil'],
    ['/home/admin', '/inicio'],
    ['/home/desconhecida', '/inicio'],
    ['/home/desconhecida/1/2', '/inicio'],
  ];
  for (const [legacy, expected] of cases) assert.equal(m.legacyHomeTarget(legacy), expected, legacy);
  // Valores brutos preservados (a Home valida e corrige depois).
  assert.equal(m.legacyHomeTarget('/home/conteudos/abc'), '/aprender/abc');
  assert.equal(m.legacyHomeTarget('/home/conteudos/8/xyz'), '/aprender/8/xyz');
  // O que sai de um redirect legado e sempre rota reconhecida do aluno.
  for (const [legacy] of cases) assert.ok(m.isStudentAreaPath(m.legacyHomeTarget(legacy)), legacy);
});
