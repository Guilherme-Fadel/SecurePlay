const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function envFlag(name) {
  return ['true', '1', 'yes'].includes(
    String(process.env[name] || '').trim().toLowerCase(),
  );
}

async function run() {
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
    const [[count]] = await connection.query(
      'SELECT COUNT(*) AS total FROM usuario',
    );
    if (Number(count.total) > 0) {
      process.stdout.write(
        'Bootstrap de administrador ignorado: o banco já possui usuários.\n',
      );
      return;
    }

    const email = required('INITIAL_ADMIN_EMAIL').toLowerCase();
    const password = required('INITIAL_ADMIN_PASSWORD');
    const name = process.env.INITIAL_ADMIN_NAME?.trim() || 'Administrador';
    const companyId = process.env.INITIAL_ADMIN_COMPANY_ID?.trim() || null;
    const passwordHash = await bcrypt.hash(password, 12);

    await connection.query(
      `INSERT INTO usuario
        (name, email, password, level, role, empresa_id, nickname_request_status, email_verification_required)
       VALUES (?, ?, ?, 1, 'platform_admin', ?, 'none', 1)`,
      [name, email, passwordHash, companyId],
    );
    process.stdout.write(`Administrador inicial criado: ${email}\n`);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
