const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'achievements.sql'),
      'utf8',
    );
    await connection.query(sql);
    process.stdout.write('Catálogo de conquistas e Shop aplicado com sucesso.\n');
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
