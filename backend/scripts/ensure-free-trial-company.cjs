const mysql = require('mysql2/promise');

function envFlag(name) {
  return ['true', '1', 'yes'].includes(
    String(process.env[name] || '').trim().toLowerCase(),
  );
}

async function run() {
  if (!envFlag('SEED_FREE_TRIAL')) {
    process.stdout.write(
      'Seed free_trial ignorado (SEED_FREE_TRIAL não está habilitado).\n',
    );
    return;
  }

  const encodedCa = process.env.DB_CA_CERT_BASE64?.trim();
  const ca = encodedCa
    ? Buffer.from(encodedCa, 'base64').toString('utf8')
    : undefined;
  const ssl = envFlag('DB_SSL')
    ? {
        rejectUnauthorized: envFlag('DB_SSL_REJECT_UNAUTHORIZED'),
        ...(ca ? { ca } : {}),
      }
    : undefined;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
  });

  try {
    const [rows] = await connection.query(
      "SELECT id FROM empresa WHERE system_key = 'free_trial' LIMIT 1",
    );

    if (rows.length > 0) {
      process.stdout.write(
        `Empresa free_trial já existe (id=${rows[0].id}); nenhum dado foi alterado.\n`,
      );
      return;
    }

    await connection.query(
      `INSERT INTO empresa
        (nome, system_key, parametros_funcionalidades, created_at, updated_at)
       VALUES (?, 'free_trial', ?, NOW(6), NOW(6))`,
      [
        'SecurePlay Teste Gratuito',
        JSON.stringify({
          rankingEnabled: false,
          globalRankingEnabled: false,
          achievementsEnabled: true,
          enabledGames: [
            'quiz-relampago',
            'caca-phishing',
            'classificacao-dados',
            'termotech',
          ],
        }),
      ],
    );
    process.stdout.write('Empresa free_trial criada.\n');
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
