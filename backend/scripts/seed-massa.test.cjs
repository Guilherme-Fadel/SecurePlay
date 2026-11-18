const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CONFIG,
  DOMINIO_EMAIL,
  montarEscola,
  avaliarGuarda,
  resolverSenha,
  temporadaAtual,
} = require('./seed-massa.cjs');

const AGORA = new Date('2026-11-18T12:00:00Z');
const todasEscolas = () =>
  Array.from({ length: CONFIG.escolas }, (_, i) => montarEscola(i + 1, CONFIG, AGORA));

test('gera 3000 alunos com e-mails únicos no domínio reservado', () => {
  const usuarios = todasEscolas().flatMap((e) => e.usuarios);
  const alunos = usuarios.filter((u) => u.papel === 'user');
  assert.equal(alunos.length, 3000);
  assert.equal(usuarios.filter((u) => u.papel === 'admin').length, CONFIG.escolas * 2);
  assert.equal(usuarios.filter((u) => u.papel === 'teacher').length, CONFIG.escolas * 5);
  const emails = usuarios.map((u) => u.email);
  assert.equal(new Set(emails).size, emails.length);
  assert.ok(emails.every((e) => e.endsWith(`@${DOMINIO_EMAIL}`)));
  assert.equal(alunos[0].email, `aluno.e01.0001@${DOMINIO_EMAIL}`);
});

test('apelidos são válidos (regex do app, até 24 caracteres) e únicos', () => {
  const apelidos = todasEscolas()
    .flatMap((e) => e.usuarios)
    .filter((u) => u.papel === 'user')
    .map((u) => u.nickname);
  for (const a of apelidos) {
    assert.match(a, /^[\p{L}\p{N} _-]+$/u);
    assert.ok(a.length >= 3 && a.length <= 24, `tamanho inválido: ${a}`);
  }
  assert.equal(new Set(apelidos).size, apelidos.length);
});

test('turmas: 20 por escola, ~25 alunos, professores vinculados, nomes únicos', () => {
  const escola = montarEscola(1, CONFIG, AGORA);
  assert.equal(escola.turmas.length, 20);
  assert.equal(new Set(escola.turmas.map((t) => t.nome)).size, 20);
  for (const t of escola.turmas) {
    assert.equal(t.alunos.length, 25);
    assert.ok(new Set(t.professores).size >= 1);
  }
});

test('é determinístico: duas execuções geram as mesmas linhas', () => {
  assert.deepEqual(todasEscolas(), todasEscolas());
});

test('cerca de 70% dos alunos têm progresso coerente', () => {
  const prog = todasEscolas().flatMap((e) => e.progresso);
  const com = prog.filter((p) => p.total > 0);
  const frac = com.length / prog.length;
  assert.ok(frac > 0.65 && frac < 0.75, `fração fora do esperado: ${frac}`);
  assert.ok(com.every((p) => p.temporada <= p.total && p.nivel === Math.floor(p.total / 1000)));
});

test('guarda recusa produção, banco diferente e confirmação ausente', () => {
  const base = { DB_NAME: 'secureplay_dev', SEED_MASSA_CONFIRMAR: 'secureplay_dev' };
  assert.equal(avaliarGuarda(base).ok, true);
  assert.equal(avaliarGuarda({ ...base, NODE_ENV: 'production' }).ok, false);
  assert.equal(avaliarGuarda({ ...base, SEED_MASSA_CONFIRMAR: 'outro_banco' }).ok, false);
  assert.equal(avaliarGuarda({ DB_NAME: 'secureplay_dev' }).ok, false);
  assert.equal(avaliarGuarda({ SEED_MASSA_CONFIRMAR: '' }).ok, false);
});

test('senha: exige 12+ caracteres quando informada e gera quando ausente', () => {
  assert.throws(() => resolverSenha({ SEED_MASSA_SENHA: 'curta' }, () => 'x'));
  assert.deepEqual(resolverSenha({ SEED_MASSA_SENHA: 'umaSenhaLonga123' }, () => 'x'), {
    senha: 'umaSenhaLonga123',
    gerada: false,
  });
  assert.deepEqual(resolverSenha({}, () => 'gerada'), { senha: 'gerada', gerada: true });
});

test('temporada usa o horário de Brasília', () => {
  assert.equal(temporadaAtual(new Date('2026-12-01T01:00:00Z')), '2026-11');
  assert.equal(temporadaAtual(new Date('2026-12-01T04:00:00Z')), '2026-12');
});
