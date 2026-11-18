/*
 * Massa de teste: 6 escolas, 3000 alunos, professores, admins, turmas e progresso.
 * Só ADICIONA registros (marcados por e-mail @massa.secureplay.test e escola "(massa)").
 * Uso: ver backend/scripts/README-seed-massa.md.
 *
 * A lógica pura (geração de linhas) é exportada para teste; a parte com banco só roda via CLI.
 */

// ---------------------------------------------------------------------------
// Constantes ajustáveis
// ---------------------------------------------------------------------------
const CONFIG = {
  escolas: 6,
  adminsPorEscola: 2,
  professoresPorEscola: 5,
  alunosPorEscola: 500,
  turmasPorEscola: 20,
  professoresPorTurma: 2,
  percentualComProgresso: 0.7,
  maxAulasConcluidas: 15,
  semente: 20261118,
};

const DOMINIO_EMAIL = 'massa.secureplay.test';
const SUFIXO_ESCOLA = '(massa)';
const PREFIXO_ESCOLA = 'Escola Massa';
const TAMANHO_LOTE = 500;
const CUSTO_BCRYPT = 10; // mesmo custo do app (registration/usuario services)

const PARAMETROS_ESCOLA = {
  rankingEnabled: true,
  globalRankingEnabled: true,
  achievementsEnabled: true,
  enabledGames: [
    'quiz-relampago',
    'caca-phishing',
    'classificacao-dados',
    'termotech',
  ],
};

const PRIMEIROS_NOMES = [
  'Ana', 'Bruno', 'Carla', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique',
  'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olívia', 'Pedro',
  'Quézia', 'Rafael', 'Sofia', 'Thiago', 'Valentina', 'Wesley', 'Yasmin', 'Arthur',
  'Beatriz', 'Caio', 'Débora', 'Enzo', 'Fernanda', 'Gustavo', 'Helena', 'Igor',
  'Julia', 'Kaique', 'Larissa', 'Miguel', 'Natália', 'Otávio', 'Paula', 'Renato',
];

const SOBRENOMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos',
  'Teixeira', 'Araújo', 'Pinto', 'Cavalcanti', 'Monteiro', 'Moura', 'Correia', 'Azevedo',
];

// Palavras curtas: "animal adjetivo NNNN" precisa caber em 24 caracteres.
const ANIMAIS = [
  'Raposa', 'Lobo', 'Coruja', 'Tigre', 'Falcão', 'Onça', 'Golfinho', 'Arara',
  'Tucano', 'Jaguar', 'Pantera', 'Gavião', 'Tartaruga', 'Lontra', 'Capivara', 'Mico',
  'Puma', 'Condor', 'Baleia', 'Tubarão', 'Águia', 'Lince', 'Pinguim', 'Panda',
  'Koala', 'Dragão', 'Fênix', 'Cobra', 'Gato', 'Urso',
];

// Só adjetivos de dois gêneros, para concordar com qualquer animal ("Pantera Veloz", "Lobo Veloz").
const ADJETIVOS = [
  'Veloz', 'Ágil', 'Forte', 'Audaz', 'Sagaz', 'Radiante', 'Alegre', 'Leal',
  'Gentil', 'Digital', 'Genial', 'Feliz', 'Capaz', 'Incrível', 'Valente', 'Brilhante',
  'Elegante', 'Constante', 'Gigante', 'Vibrante', 'Tenaz', 'Nobre', 'Firme', 'Hábil',
  'Estelar', 'Polar', 'Lunar', 'Solar', 'Jovem', 'Sutil',
];

const SERIES = ['6º Ano', '7º Ano', '8º Ano', '9º Ano', '1º Médio'];
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ---------------------------------------------------------------------------
// Lógica pura (sem I/O)
// ---------------------------------------------------------------------------

/** PRNG determinístico (mulberry32). */
function mulberry32(semente) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** PRNG independente por (escola, tipo, índice): o resultado não depende da ordem do laço. */
function rngDe(config, escola, tipo, indice) {
  return mulberry32(
    (config.semente * 2654435761 + escola * 40503 + tipo * 9973 + indice * 7919) >>> 0,
  );
}

const p2 = (n) => String(n).padStart(2, '0');
const p4 = (n) => String(n).padStart(4, '0');

function emailAdmin(escola, n) {
  return `admin.e${p2(escola)}.${n}@${DOMINIO_EMAIL}`;
}
function emailProfessor(escola, n) {
  return `prof.e${p2(escola)}.${n}@${DOMINIO_EMAIL}`;
}
function emailAluno(escola, n) {
  return `aluno.e${p2(escola)}.${p4(n)}@${DOMINIO_EMAIL}`;
}
function nomeEscola(escola) {
  return `${PREFIXO_ESCOLA} ${p2(escola)} ${SUFIXO_ESCOLA}`;
}

function nomePessoa(rng) {
  const pick = (lista) => lista[Math.floor(rng() * lista.length)];
  const s1 = pick(SOBRENOMES);
  let s2 = pick(SOBRENOMES);
  if (s2 === s1) s2 = SOBRENOMES[(SOBRENOMES.indexOf(s1) + 1) % SOBRENOMES.length];
  return `${pick(PRIMEIROS_NOMES)} ${s1} ${s2}`;
}

/** Apelido "Animal Adjetivo NNNN"; o sufixo numérico global garante unicidade. */
function apelidoAluno(rng, numeroGlobal) {
  const animal = ANIMAIS[Math.floor(rng() * ANIMAIS.length)];
  const adjetivo = ADJETIVOS[Math.floor(rng() * ADJETIVOS.length)];
  return `${animal} ${adjetivo} ${p4(numeroGlobal)}`;
}

/** Temporada de ranking (AAAA-MM) no horário de Brasília. */
function temporadaAtual(agora) {
  const local = new Date(agora.getTime() - 3 * 3600 * 1000);
  return local.toISOString().slice(0, 7);
}

/** XP total (log-normal, mediana ~600), XP da temporada, sequência e aulas, determinísticos. */
function sortearProgresso(rng, config) {
  if (rng() >= config.percentualComProgresso) {
    return { total: 0, temporada: 0, nivel: 0, sequencia: 0, aulasConcluidas: 0, aulaEmAndamento: false };
  }
  const u1 = 1 - rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const total = Math.min(30000, Math.max(10, Math.round(Math.exp(6.4 + 1.0 * z))));
  return {
    total,
    temporada: Math.round(total * (0.2 + 0.5 * rng())),
    nivel: Math.floor(total / 1000),
    sequencia: Math.floor(rng() * 8),
    aulasConcluidas: Math.min(config.maxAulasConcluidas, Math.floor(total / 350)),
    aulaEmAndamento: rng() < 0.3,
  };
}

function nomeTurma(indice) {
  return `${SERIES[Math.floor(indice / 4) % SERIES.length]} ${LETRAS[indice % 4]}`;
}

/** Monta, sem tocar no banco, todas as linhas de uma escola (1-based). */
function montarEscola(escola, config = CONFIG, agora = new Date()) {
  const usuarios = [];
  const base = (extra) => ({
    nickname: null,
    nivel: 0,
    ...extra,
  });

  for (let n = 1; n <= config.adminsPorEscola; n += 1) {
    const rng = rngDe(config, escola, 1, n);
    usuarios.push(base({ papel: 'admin', email: emailAdmin(escola, n), nome: nomePessoa(rng) }));
  }
  for (let n = 1; n <= config.professoresPorEscola; n += 1) {
    const rng = rngDe(config, escola, 2, n);
    usuarios.push(base({ papel: 'teacher', email: emailProfessor(escola, n), nome: nomePessoa(rng) }));
  }

  const turmas = Array.from({ length: config.turmasPorEscola }, (_, t) => ({
    nome: nomeTurma(t),
    anoLetivo: agora.getUTCFullYear(),
    professores: Array.from({ length: config.professoresPorTurma }, (_, k) =>
      emailProfessor(escola, ((t + k * 2) % config.professoresPorEscola) + 1),
    ),
    alunos: [],
  }));

  const progresso = [];
  for (let n = 1; n <= config.alunosPorEscola; n += 1) {
    const rng = rngDe(config, escola, 3, n);
    const numeroGlobal = (escola - 1) * config.alunosPorEscola + n;
    const email = emailAluno(escola, n);
    const prog = sortearProgresso(rng, config);
    usuarios.push(
      base({
        papel: 'user',
        email,
        nome: nomePessoa(rng),
        nickname: apelidoAluno(rng, numeroGlobal),
        nivel: prog.nivel,
      }),
    );
    turmas[(n - 1) % config.turmasPorEscola].alunos.push(email);
    progresso.push({ email, ...prog, diasAtras: Math.floor(rng() * 30) });
  }

  return {
    empresa: { nome: nomeEscola(escola), parametros: PARAMETROS_ESCOLA },
    usuarios,
    turmas,
    progresso,
  };
}

/** Guarda de segurança; devolve { ok, motivo }. */
function avaliarGuarda(env) {
  if (env.NODE_ENV === 'production') {
    return { ok: false, motivo: 'NODE_ENV=production: o seed de massa nunca roda em produção.' };
  }
  const banco = String(env.DB_NAME || '').trim();
  if (!banco) return { ok: false, motivo: 'DB_NAME ausente.' };
  if (String(env.SEED_MASSA_CONFIRMAR || '') !== banco) {
    return {
      ok: false,
      motivo: `Confirmação ausente ou diferente: defina SEED_MASSA_CONFIRMAR=${banco} para autorizar.`,
    };
  }
  return { ok: true, motivo: '' };
}

function resolverSenha(env, gerar) {
  const informada = env.SEED_MASSA_SENHA;
  if (informada !== undefined && informada !== '') {
    if (informada.length < 12) throw new Error('SEED_MASSA_SENHA precisa ter ao menos 12 caracteres.');
    return { senha: informada, gerada: false };
  }
  return { senha: gerar(), gerada: true };
}

function emLotes(lista, tamanho = TAMANHO_LOTE) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamanho) lotes.push(lista.slice(i, i + tamanho));
  return lotes;
}

// ---------------------------------------------------------------------------
// Banco (só via CLI)
// ---------------------------------------------------------------------------

function envFlag(name) {
  return ['true', '1', 'yes'].includes(String(process.env[name] || '').trim().toLowerCase());
}

async function conectar(mysql) {
  const encodedCa = process.env.DB_CA_CERT_BASE64?.trim();
  const ca = encodedCa ? Buffer.from(encodedCa, 'base64').toString('utf8') : undefined;
  const ssl = envFlag('DB_SSL')
    ? { rejectUnauthorized: envFlag('DB_SSL_REJECT_UNAUTHORIZED'), ...(ca ? { ca } : {}) }
    : undefined;
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
  });
}

const log = (msg) => process.stdout.write(`${msg}\n`);

async function inserirEmLotes(conn, tabela, colunas, linhas) {
  for (const lote of emLotes(linhas)) {
    await conn.query(`INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES ?`, [lote]);
  }
}

async function semear(conn, hash, agora) {
  const [aulasRows] = await conn.query(
    'SELECT id FROM aula WHERE active = 1 ORDER BY modulo_id, `order`, id LIMIT 200',
  );
  const aulaIds = aulasRows.map((r) => r.id);
  if (!aulaIds.length) log('Nenhuma aula ativa encontrada: o progresso de aulas será ignorado.');
  const temporada = temporadaAtual(agora);
  const resumo = { escolas: 0, ignoradas: 0, admin: 0, teacher: 0, user: 0, turmas: 0, comProgresso: 0, aulas: 0 };

  for (let e = 1; e <= CONFIG.escolas; e += 1) {
    const dados = montarEscola(e, CONFIG, agora);
    const [[existe]] = await conn.query('SELECT COUNT(*) AS n FROM empresa WHERE nome = ?', [dados.empresa.nome]);
    if (Number(existe.n) > 0) {
      log(`[${p2(e)}] ${dados.empresa.nome} já existe: ignorada.`);
      resumo.ignoradas += 1;
      continue;
    }
    await conn.beginTransaction();
    try {
      const [r] = await conn.query('INSERT INTO empresa (nome, parametros_funcionalidades) VALUES (?, ?)', [
        dados.empresa.nome,
        JSON.stringify(dados.empresa.parametros),
      ]);
      const empresaId = r.insertId;

      const linhasUsuario = dados.usuarios.map((u) => [
        u.nome, u.email, hash, u.nivel, u.papel, empresaId,
        u.nickname, u.nickname ? 'approved' : 'none', 0, 1, agora, 0, 0, 0,
      ]);
      await inserirEmLotes(
        conn,
        'usuario',
        [
          'name', 'email', 'password', 'level', 'role', 'empresa_id',
          'nickname', 'nickname_request_status', 'nickname_onboarding_pending', 'active',
          'email_verified_at', 'email_verification_required', 'password_change_required', 'session_version',
        ],
        linhasUsuario,
      );
      log(`[${p2(e)}] ${dados.usuarios.length} usuários inseridos.`);
      const [idsRows] = await conn.query('SELECT id, email FROM usuario WHERE empresa_id = ?', [empresaId]);
      const idPorEmail = new Map(idsRows.map((u) => [u.email, u.id]));

      await inserirEmLotes(
        conn,
        'turma',
        ['empresa_id', 'nome', 'ano_letivo', 'ativa'],
        dados.turmas.map((t) => [empresaId, t.nome, t.anoLetivo, 1]),
      );
      const [turmasRows] = await conn.query('SELECT id, nome FROM turma WHERE empresa_id = ?', [empresaId]);
      const idTurma = new Map(turmasRows.map((t) => [t.nome, t.id]));
      const vinculosProf = [];
      const vinculosAluno = [];
      for (const t of dados.turmas) {
        const tid = idTurma.get(t.nome);
        for (const p of new Set(t.professores)) vinculosProf.push([tid, idPorEmail.get(p)]);
        for (const a of t.alunos) vinculosAluno.push([idPorEmail.get(a), tid, agora]);
      }
      await inserirEmLotes(conn, 'turma_professor', ['turma_id', 'usuario_id'], vinculosProf);
      await inserirEmLotes(conn, 'turma_aluno', ['usuario_id', 'turma_id', 'entrou_em'], vinculosAluno);

      const stats = [];
      const pontosTemporada = [];
      const aulas = [];
      let comProgresso = 0;
      for (const p of dados.progresso) {
        const uid = idPorEmail.get(p.email);
        stats.push([uid, p.total, p.sequencia]);
        if (p.total > 0) {
          comProgresso += 1;
          pontosTemporada.push([temporada, uid, p.temporada]);
          const quando = new Date(agora.getTime() - p.diasAtras * 86400000);
          const concluidas = Math.min(p.aulasConcluidas, aulaIds.length);
          for (let i = 0; i < concluidas; i += 1) {
            const fim = new Date(quando.getTime() - (concluidas - i) * 3600000);
            aulas.push([uid, aulaIds[i], 1, fim, new Date(fim.getTime() - 600000), fim, 100]);
          }
          if (p.aulaEmAndamento && concluidas < aulaIds.length) {
            aulas.push([uid, aulaIds[concluidas], 0, null, quando, quando, 40]);
          }
        }
      }
      await inserirEmLotes(conn, 'usuario_stats', ['usuario_id', 'total_points', 'current_streak'], stats);
      await inserirEmLotes(conn, 'ranking_season_points', ['season_id', 'usuario_id', 'points'], pontosTemporada);
      await inserirEmLotes(
        conn,
        'usuario_aula',
        ['usuario_id', 'aula_id', 'completed', 'completed_at', 'started_at', 'last_accessed_at', 'progress_percent'],
        aulas,
      );
      await conn.commit();

      resumo.escolas += 1;
      resumo.turmas += dados.turmas.length;
      resumo.comProgresso += comProgresso;
      resumo.aulas += aulas.length;
      for (const u of dados.usuarios) resumo[u.papel] += 1;
      log(`[${p2(e)}] ${dados.empresa.nome}: ${dados.turmas.length} turmas, ${comProgresso} alunos com progresso, ${aulas.length} registros de aula. OK.`);
    } catch (erro) {
      await conn.rollback();
      throw new Error(`Falha na escola ${p2(e)} (revertida): ${erro.message}`);
    }
  }
  return resumo;
}

// --- Limpeza -------------------------------------------------------------

const MARCADOR_EMAIL = `%@${DOMINIO_EMAIL}`;
const MARCADOR_ESCOLA = `${PREFIXO_ESCOLA} % ${SUFIXO_ESCOLA}`;

async function tabelasFilhas(conn, tabela) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME AS tabela, COLUMN_NAME AS coluna, REFERENCED_COLUMN_NAME AS ref
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME = ?`,
    [tabela],
  );
  return rows;
}

/**
 * Remove, recursivamente e na ordem das FKs, as linhas que dependem de `ids` da tabela pai.
 * Só segue FKs descobertas no information_schema; nunca apaga a própria tabela pai.
 */
async function removerDependentes(conn, pai, colunaPai, ids, apagados, ignorar = new Set(), nivel = 0) {
  if (!ids.length) return;
  if (nivel > 6) throw new Error(`Cadeia de dependências profunda demais em ${pai}.`);
  for (const lote of emLotes(ids, 1000)) {
    for (const f of await tabelasFilhas(conn, pai)) {
      if (f.ref !== colunaPai || f.tabela === pai || ignorar.has(f.tabela)) continue;
      const netos = (await tabelasFilhas(conn, f.tabela)).filter((n) => n.tabela !== f.tabela);
      if (netos.length) {
        const [pks] = await conn.query(`SELECT id FROM \`${f.tabela}\` WHERE \`${f.coluna}\` IN (?)`, [lote]);
        await removerDependentes(conn, f.tabela, 'id', pks.map((p) => p.id), apagados, ignorar, nivel + 1);
      }
      const [res] = await conn.query(`DELETE FROM \`${f.tabela}\` WHERE \`${f.coluna}\` IN (?)`, [lote]);
      if (res.affectedRows) apagados.set(f.tabela, (apagados.get(f.tabela) || 0) + res.affectedRows);
    }
  }
}

async function limpar(conn) {
  const [empresas] = await conn.query('SELECT id FROM empresa WHERE nome LIKE ?', [MARCADOR_ESCOLA]);
  const empresaIds = empresas.map((e) => e.id);
  const [usuarios] = await conn.query('SELECT id FROM usuario WHERE email LIKE ?', [MARCADOR_EMAIL]);
  const usuarioIds = usuarios.map((u) => u.id);
  const apagados = new Map();

  await conn.beginTransaction();
  try {
    let turmaIds = [];
    if (empresaIds.length) {
      const [alheios] = await conn.query(
        'SELECT COUNT(*) AS n FROM usuario WHERE empresa_id IN (?) AND (email IS NULL OR email NOT LIKE ?)',
        [empresaIds, MARCADOR_EMAIL],
      );
      if (Number(alheios[0].n) > 0) {
        throw new Error('Há usuários que não são da massa vinculados às escolas da massa; limpeza abortada.');
      }
      const [turmas] = await conn.query('SELECT id FROM turma WHERE empresa_id IN (?)', [empresaIds]);
      turmaIds = turmas.map((t) => t.id);
    }
    // 1. dependentes das turmas (turma_aluno, turma_professor, turma_modulo, ...)
    await removerDependentes(conn, 'turma', 'id', turmaIds, apagados);
    // 2. dependentes dos usuários (usuario_aula, usuario_stats, ranking_season_points, notification, ...)
    await removerDependentes(conn, 'usuario', 'id', usuarioIds, apagados);
    // 3. turmas, 4. usuários
    for (const lote of emLotes(turmaIds, 1000)) {
      const [r] = await conn.query('DELETE FROM turma WHERE id IN (?)', [lote]);
      apagados.set('turma', (apagados.get('turma') || 0) + r.affectedRows);
    }
    for (const lote of emLotes(usuarioIds, 1000)) {
      const [r] = await conn.query('DELETE FROM usuario WHERE id IN (?)', [lote]);
      apagados.set('usuario', (apagados.get('usuario') || 0) + r.affectedRows);
    }
    // 5. dependentes das escolas (exceto usuario/turma, já tratados) e 6. as escolas
    await removerDependentes(conn, 'empresa', 'id', empresaIds, apagados, new Set(['usuario', 'turma']));
    if (empresaIds.length) {
      const [r] = await conn.query('DELETE FROM empresa WHERE id IN (?)', [empresaIds]);
      apagados.set('empresa', r.affectedRows);
    }
    await conn.commit();
  } catch (erro) {
    await conn.rollback();
    throw new Error(`Limpeza revertida: ${erro.message}`);
  }
  return apagados;
}

// --- CLI -------------------------------------------------------------------

async function main(argv = process.argv.slice(2)) {
  const guarda = avaliarGuarda(process.env);
  if (!guarda.ok) {
    process.stderr.write(
      `${guarda.motivo}\nDestino: banco "${process.env.DB_NAME || '?'}" em ${process.env.DB_HOST || '?'}:${process.env.DB_PORT || 3306}. Nada foi escrito.\n`,
    );
    process.exitCode = 1;
    return;
  }
  const modoLimpar = argv.includes('--limpar');
  const mysql = require('mysql2/promise');
  let senha;
  let hash;
  if (!modoLimpar) {
    const crypto = require('crypto');
    senha = resolverSenha(process.env, () => crypto.randomBytes(15).toString('base64url'));
    hash = await require('bcrypt').hash(senha.senha, CUSTO_BCRYPT);
  }
  const conn = await conectar(mysql);
  try {
    log(`Destino: banco "${process.env.DB_NAME}" em ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
    if (modoLimpar) {
      const apagados = await limpar(conn);
      log('Limpeza concluída. Linhas removidas por tabela:');
      for (const [t, n] of apagados) log(`  ${t}: ${n}`);
      if (!apagados.size) log('  (nada da massa encontrado)');
      return;
    }
    const resumo = await semear(conn, hash, new Date());
    log('\n=== Resumo da massa ===');
    log(`Escolas criadas: ${resumo.escolas} (já existentes, ignoradas: ${resumo.ignoradas})`);
    log(`Usuários: ${resumo.admin} admins, ${resumo.teacher} professores, ${resumo.user} alunos`);
    log(`Turmas: ${resumo.turmas}; alunos com progresso: ${resumo.comProgresso}; registros de aula: ${resumo.aulas}`);
    log('\nLogins de exemplo (escola 01):');
    log(`  admin:     ${emailAdmin(1, 1)}  (exigirá cadastro de MFA no primeiro login)`);
    log(`  professor: ${emailProfessor(1, 1)}`);
    log(`  aluno:     ${emailAluno(1, 1)}`);
    if (senha.gerada) log(`Senha de todos (gerada, exibida só agora): ${senha.senha}`);
    else log('Senha de todos: valor de SEED_MASSA_SENHA.');
    log('Os admins da massa precisarão cadastrar MFA no primeiro login.');
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  main().catch((erro) => {
    process.stderr.write(`${erro.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  CONFIG,
  DOMINIO_EMAIL,
  mulberry32,
  emailAdmin,
  emailProfessor,
  emailAluno,
  nomeEscola,
  apelidoAluno,
  nomePessoa,
  temporadaAtual,
  sortearProgresso,
  montarEscola,
  avaliarGuarda,
  resolverSenha,
  emLotes,
};
