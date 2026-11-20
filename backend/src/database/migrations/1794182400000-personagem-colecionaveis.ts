import { MigrationInterface, QueryRunner } from 'typeorm';

const COLLATE = 'COLLATE utf8mb4_unicode_ci';
const OLD_TYPES = "'frame','background','title','badge','effect'";
const NEW_TYPES = `${OLD_TYPES},'skin','head','face','neck','card'`;
const OLD_RARITIES = "'common','uncommon','rare','epic','legendary'";
const NEW_RARITIES = `${OLD_RARITIES},'festive'`;

type ColumnSpec = { name: string; definition: string };

/** Colunas novas de `cosmetic_item`; todas nulas ou com padrão, então linhas existentes seguem válidas. */
const ITEM_COLUMNS: ColumnSpec[] = [
  { name: 'kit_id', definition: 'int NULL' },
  { name: 'festive_event', definition: `varchar(40) ${COLLATE} NULL` },
  { name: 'available_from', definition: 'datetime(6) NULL' },
  { name: 'available_until', definition: 'datetime(6) NULL' },
  { name: 'unlock_rule', definition: 'json NULL' },
  { name: 'art_key', definition: `varchar(255) ${COLLATE} NULL` },
  { name: 'art_mime', definition: `varchar(40) ${COLLATE} NULL` },
  {
    name: 'layer',
    definition: `enum('back','front') ${COLLATE} NOT NULL DEFAULT 'front'`,
  },
  { name: 'recolorable', definition: 'tinyint NOT NULL DEFAULT 0' },
  { name: 'adjust_x', definition: 'decimal(6,2) NOT NULL DEFAULT 0' },
  { name: 'adjust_y', definition: 'decimal(6,2) NOT NULL DEFAULT 0' },
  { name: 'adjust_scale', definition: 'decimal(4,2) NOT NULL DEFAULT 1' },
];

/** Colunas novas que o `down` descarta e que, preenchidas em qualquer item, bloqueiam a reversão. */
const ITEM_DATA_COLUMNS = [
  'unlock_rule',
  'art_key',
  'art_mime',
  'available_from',
  'available_until',
  'festive_event',
  'kit_id',
];

/** Colunas com padrão: valor diferente do padrão é configuração do item que a reversão perderia. */
const ITEM_NON_DEFAULT_COLUMNS: { name: string; differs: string }[] = [
  { name: 'layer', differs: "`layer` <> 'front'" },
  { name: 'recolorable', differs: '`recolorable` <> 0' },
  { name: 'adjust_x', differs: '`adjust_x` <> 0' },
  { name: 'adjust_y', differs: '`adjust_y` <> 0' },
  { name: 'adjust_scale', differs: '`adjust_scale` <> 1' },
];

const OWNED_COLUMNS: ColumnSpec[] = [
  { name: 'color', definition: `varchar(7) ${COLLATE} NULL` },
  { name: 'acquired_kit_id', definition: 'int NULL' },
];

const FK_ITEM_KIT = 'fk_cosmetic_item_kit';
const FK_OWNED_KIT = 'fk_usuario_cosmetic_acquired_kit';

/**
 * Personagem montável e kits. Aditiva: só adiciona colunas anuláveis/com padrão, alarga os
 * enums `type` e `rarity` e cria `cosmetic_kit` e `usuario_cosmetic_kit`. Nenhuma linha é lida,
 * alterada ou removida no `up`. Guardas por coluna/tabela/FK toleram bancos locais em que o
 * synchronize já criou parte do esquema.
 */
export class PersonagemColecionaveis1794182400000 implements MigrationInterface {
  name = 'PersonagemColecionaveis1794182400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`cosmetic_item\` MODIFY COLUMN \`type\` enum(${NEW_TYPES}) ${COLLATE} NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`cosmetic_item\` MODIFY COLUMN \`rarity\` enum(${NEW_RARITIES}) ${COLLATE} NOT NULL`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`cosmetic_kit\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`slug\` varchar(80) ${COLLATE} NOT NULL,
      \`name\` varchar(120) ${COLLATE} NOT NULL,
      \`description\` varchar(400) ${COLLATE} NOT NULL,
      \`rarity\` enum(${NEW_RARITIES}) ${COLLATE} NOT NULL,
      \`price\` int NOT NULL,
      \`festive_event\` varchar(40) ${COLLATE} NULL,
      \`available_from\` datetime(6) NULL,
      \`available_until\` datetime(6) NULL,
      \`unlock_rule\` json NULL,
      \`active\` tinyint NOT NULL DEFAULT 0,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`ux_cosmetic_kit_slug\` (\`slug\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ${COLLATE}`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`usuario_cosmetic_kit\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`usuario_id\` int NOT NULL,
      \`kit_id\` int NOT NULL,
      \`purchased_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`ux_usuario_cosmetic_kit_usuario_kit\` (\`usuario_id\`,\`kit_id\`),
      KEY \`ix_usuario_cosmetic_kit_kit\` (\`kit_id\`),
      CONSTRAINT \`fk_usuario_cosmetic_kit_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuario\` (\`id\`),
      CONSTRAINT \`fk_usuario_cosmetic_kit_kit\` FOREIGN KEY (\`kit_id\`) REFERENCES \`cosmetic_kit\` (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ${COLLATE}`);

    for (const column of ITEM_COLUMNS)
      await this.addColumn(queryRunner, 'cosmetic_item', column);
    for (const column of OWNED_COLUMNS)
      await this.addColumn(queryRunner, 'usuario_cosmetic', column);

    if (
      !(await this.foreignKeyExists(queryRunner, 'cosmetic_item', FK_ITEM_KIT))
    )
      await queryRunner.query(
        `ALTER TABLE \`cosmetic_item\` ADD CONSTRAINT \`${FK_ITEM_KIT}\` FOREIGN KEY (\`kit_id\`) REFERENCES \`cosmetic_kit\` (\`id\`)`,
      );
    if (
      !(await this.foreignKeyExists(
        queryRunner,
        'usuario_cosmetic',
        FK_OWNED_KIT,
      ))
    )
      await queryRunner.query(
        `ALTER TABLE \`usuario_cosmetic\` ADD CONSTRAINT \`${FK_OWNED_KIT}\` FOREIGN KEY (\`acquired_kit_id\`) REFERENCES \`cosmetic_kit\` (\`id\`)`,
      );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.assertNothingToLose(queryRunner);

    if (await this.foreignKeyExists(queryRunner, 'cosmetic_item', FK_ITEM_KIT))
      await queryRunner.query(
        `ALTER TABLE \`cosmetic_item\` DROP FOREIGN KEY \`${FK_ITEM_KIT}\``,
      );
    if (
      await this.foreignKeyExists(queryRunner, 'usuario_cosmetic', FK_OWNED_KIT)
    )
      await queryRunner.query(
        `ALTER TABLE \`usuario_cosmetic\` DROP FOREIGN KEY \`${FK_OWNED_KIT}\``,
      );

    for (const column of [...OWNED_COLUMNS].reverse())
      await this.dropColumn(queryRunner, 'usuario_cosmetic', column.name);
    for (const column of [...ITEM_COLUMNS].reverse())
      await this.dropColumn(queryRunner, 'cosmetic_item', column.name);

    if (await queryRunner.hasTable('usuario_cosmetic_kit'))
      await queryRunner.query('DROP TABLE `usuario_cosmetic_kit`');
    if (await queryRunner.hasTable('cosmetic_kit'))
      await queryRunner.query('DROP TABLE `cosmetic_kit`');

    await queryRunner.query(
      `ALTER TABLE \`cosmetic_item\` MODIFY COLUMN \`rarity\` enum(${OLD_RARITIES}) ${COLLATE} NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`cosmetic_item\` MODIFY COLUMN \`type\` enum(${OLD_TYPES}) ${COLLATE} NOT NULL`,
    );
  }

  /** Recusa a reversão, antes de qualquer alteração, se ela destruiria dados criados depois do up. */
  private async assertNothingToLose(queryRunner: QueryRunner): Promise<void> {
    const problems: string[] = [];
    const count = async (sql: string) => {
      const rows = (await queryRunner.query(sql)) as {
        total: string | number;
      }[];
      return Number(rows[0]?.total ?? 0);
    };

    // Estreitar enum com linhas usando valores novos perderia dados.
    const items = await count(
      "SELECT COUNT(*) AS total FROM `cosmetic_item` WHERE `type` IN ('skin','head','face','neck','card') OR `rarity` = 'festive'",
    );
    if (items > 0)
      problems.push(
        `${items} item(ns) de cosmetic_item usam valores novos de type (skin, head, face, neck, card) ou rarity (festive)`,
      );
    problems.push(...(await this.itemColumnProblems(queryRunner, count)));
    if (await queryRunner.hasTable('usuario_cosmetic_kit')) {
      const purchases = await count(
        'SELECT COUNT(*) AS total FROM `usuario_cosmetic_kit`',
      );
      if (purchases > 0)
        problems.push(`${purchases} compra(s) de kit em usuario_cosmetic_kit`);
    }
    if (await queryRunner.hasTable('cosmetic_kit')) {
      const kits = await count('SELECT COUNT(*) AS total FROM `cosmetic_kit`');
      if (kits > 0) problems.push(`${kits} kit(s) em cosmetic_kit`);
    }
    for (const column of ['color', 'acquired_kit_id']) {
      if (!(await queryRunner.hasColumn('usuario_cosmetic', column))) continue;
      const owned = await count(
        `SELECT COUNT(*) AS total FROM \`usuario_cosmetic\` WHERE \`${column}\` IS NOT NULL`,
      );
      if (owned > 0)
        problems.push(
          `${owned} linha(s) de usuario_cosmetic com ${column} preenchido`,
        );
    }

    if (problems.length > 0)
      throw new Error(
        `Reversão bloqueada: ${problems.join('; ')}. Remova ou migre esses dados antes de reverter.`,
      );
  }

  /** Item antigo (moldura, título...) que ganhou dado de coluna nova também perderia dados. */
  private async itemColumnProblems(
    queryRunner: QueryRunner,
    count: (sql: string) => Promise<number>,
  ): Promise<string[]> {
    const problems: string[] = [];
    for (const column of ITEM_DATA_COLUMNS) {
      if (!(await queryRunner.hasColumn('cosmetic_item', column))) continue;
      const withData = await count(
        `SELECT COUNT(*) AS total FROM \`cosmetic_item\` WHERE \`${column}\` IS NOT NULL`,
      );
      if (withData > 0)
        problems.push(
          `${withData} item(ns) de cosmetic_item com ${column} preenchido`,
        );
    }
    for (const column of ITEM_NON_DEFAULT_COLUMNS) {
      if (!(await queryRunner.hasColumn('cosmetic_item', column.name)))
        continue;
      const changed = await count(
        `SELECT COUNT(*) AS total FROM \`cosmetic_item\` WHERE ${column.differs}`,
      );
      if (changed > 0)
        problems.push(
          `${changed} item(ns) de cosmetic_item com ${column.name} diferente do padrão`,
        );
    }
    return problems;
  }

  private async addColumn(
    queryRunner: QueryRunner,
    table: string,
    column: ColumnSpec,
  ): Promise<void> {
    if (await queryRunner.hasColumn(table, column.name)) return;
    await queryRunner.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column.name}\` ${column.definition}`,
    );
  }

  private async dropColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<void> {
    if (!(await queryRunner.hasColumn(table, column))) return;
    await queryRunner.query(
      `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``,
    );
  }

  private async foreignKeyExists(
    queryRunner: QueryRunner,
    table: string,
    name: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS total FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND CONSTRAINT_NAME = '${name}' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    )) as { total: string | number }[];
    return Number(rows[0]?.total ?? 0) > 0;
  }
}
