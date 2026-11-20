import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource, MigrationInterface } from 'typeorm';
import { PersonagemColecionaveis1794182400000 } from '../database/migrations/1794182400000-personagem-colecionaveis';

const TIMESTAMP = 1794182400000;
type MigrationClass = new () => MigrationInterface;

/** Roda as migrações reais em banco descartável (opt-in, como os demais *.mysql.spec). */
const mysqlSuite =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;

mysqlSuite('PersonagemColecionaveis migration (MySQL descartável)', () => {
  const DATABASE = 'personagem_migration_fixture';
  let source: DataSource;

  function port() {
    const value = Number(process.env.ARCADE_MYSQL_PORT);
    if (!Number.isInteger(value) || value < 1024 || value > 65535)
      throw new Error('Informe a porta do container MySQL descartável');
    return value;
  }

  /** Migrações anteriores a esta, em ordem; esta roda dentro de cada teste. */
  function previousMigrations(): MigrationClass[] {
    const dir = join(__dirname, '..', 'database', 'migrations');
    return readdirSync(dir)
      .filter((file) => /^\d+-.+\.ts$/.test(file) && !file.endsWith('.spec.ts'))
      .sort()
      .filter((file) => Number(file.split('-')[0]) < TIMESTAMP)
      .flatMap((file) =>
        Object.values(
          // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga dinâmica das migrações reais em ordem
          require(join(dir, file)) as Record<string, MigrationClass>,
        ),
      );
  }

  const connect = (database?: string, migrations: MigrationClass[] = []) =>
    new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port: port(),
      username: 'root',
      password: 'arcade-fixture-only',
      database,
      timezone: '-03:00',
      synchronize: false,
      logging: false,
      migrations,
    }).initialize();

  const rows = <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
    source.query(sql, params);

  const count = async (sql: string) =>
    Number((await rows<{ total: string }>(sql))[0].total);

  const columnDefault = async (column: string) =>
    (
      await rows<{ d: string }>(
        "SELECT COLUMN_DEFAULT AS d FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cosmetic_item' AND COLUMN_NAME = ?",
        [column],
      )
    )[0].d;

  const kitTables = () =>
    count(
      "SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('cosmetic_kit','usuario_cosmetic_kit')",
    );

  async function runOnRunner(direction: 'up' | 'down') {
    const runner = source.createQueryRunner();
    try {
      await new PersonagemColecionaveis1794182400000()[direction](runner);
    } finally {
      await runner.release();
    }
  }

  beforeAll(async () => {
    const admin = await connect();
    try {
      await admin.query(`DROP DATABASE IF EXISTS \`${DATABASE}\``);
      await admin.query(
        `CREATE DATABASE \`${DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    } finally {
      await admin.destroy();
    }
    source = await connect(DATABASE, previousMigrations());
    await source.runMigrations();
    await source.query(
      // `usuario.email` é NOT NULL e único no esquema inicial; `name` e `password` são NOT NULL sem padrão.
      "INSERT INTO usuario (name, email, password) VALUES ('Migracao A', 'migracao-a@fixture.invalid', 'x'), ('Migracao B', 'migracao-b@fixture.invalid', 'x')",
    );
    const users = await rows<{ id: number }>(
      'SELECT id FROM usuario ORDER BY id DESC LIMIT 2',
    );
    const items = await rows<{ id: number }>(
      'SELECT id FROM cosmetic_item ORDER BY id LIMIT 2',
    );
    await source.query(
      'INSERT INTO usuario_cosmetic (usuario_id, cosmetic_item_id, equipped) VALUES (?, ?, 1), (?, ?, 0)',
      [users[0].id, items[0].id, users[1].id, items[1].id],
    );
  }, 120_000);

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    const admin = await connect();
    try {
      await admin.query(`DROP DATABASE IF EXISTS \`${DATABASE}\``);
    } finally {
      await admin.destroy();
    }
  });

  it('up preserva os itens do seed e o equipped, e cria colunas com padrões', async () => {
    expect(await count('SELECT COUNT(*) AS total FROM cosmetic_item')).toBe(10);
    await runOnRunner('up');
    expect(await count('SELECT COUNT(*) AS total FROM cosmetic_item')).toBe(10);
    expect(
      await count(
        'SELECT COUNT(*) AS total FROM usuario_cosmetic WHERE equipped = 1',
      ),
    ).toBe(1);
    expect(await columnDefault('layer')).toBe('front');
    expect(Number(await columnDefault('adjust_scale'))).toBe(1);
    expect(Number(await columnDefault('adjust_x'))).toBe(0);
    expect(await kitTables()).toBe(2);
  });

  it('down volta ao esquema anterior sem perder as linhas', async () => {
    await runOnRunner('down');
    expect(await count('SELECT COUNT(*) AS total FROM cosmetic_item')).toBe(10);
    expect(
      await count(
        "SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cosmetic_item' AND COLUMN_NAME IN ('kit_id','layer','unlock_rule')",
      ),
    ).toBe(0);
    expect(await kitTables()).toBe(0);
  });
});
