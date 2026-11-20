import { DataSource } from 'typeorm';
import { PersonagemColecionaveis1794182400000 } from '../database/migrations/1794182400000-personagem-colecionaveis';
import { Empresa } from '../empresa/empresa.entity';
import { Usuario } from '../usuario/usuario.entity';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';
import {
  fakeRunner,
  type FakeOptions,
} from '../../test/fixtures/migration-runner-fixture';

const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();
const allSql = (statements: string[]) => statements.map(normalize).join('\n');

describe('PersonagemColecionaveis migration (sem banco)', () => {
  const migration = new PersonagemColecionaveis1794182400000();

  it('declara o nome com o timestamp esperado', () => {
    expect(migration.name ?? PersonagemColecionaveis1794182400000.name).toMatch(
      /1794182400000$/,
    );
  });

  describe('up', () => {
    it('adiciona cada coluna nova de cosmetic_item com os padrões do contrato', async () => {
      const { runner, statements } = fakeRunner();
      await migration.up(runner as never);
      const sql = allSql(statements);
      const expected: [string, RegExp][] = [
        ['kit_id', /ADD COLUMN `kit_id` int NULL/],
        ['festive_event', /ADD COLUMN `festive_event` varchar\(40\) .*NULL/],
        ['available_from', /ADD COLUMN `available_from` datetime\(6\) NULL/],
        ['available_until', /ADD COLUMN `available_until` datetime\(6\) NULL/],
        ['unlock_rule', /ADD COLUMN `unlock_rule` json NULL/],
        ['art_key', /ADD COLUMN `art_key` varchar\(255\) .*NULL/],
        ['art_mime', /ADD COLUMN `art_mime` varchar\(40\) .*NULL/],
        [
          'layer',
          /ADD COLUMN `layer` enum\('back','front'\) .*NOT NULL DEFAULT 'front'/,
        ],
        ['recolorable', /ADD COLUMN `recolorable` tinyint NOT NULL DEFAULT 0/],
        ['adjust_x', /ADD COLUMN `adjust_x` decimal\(6,2\) NOT NULL DEFAULT 0/],
        ['adjust_y', /ADD COLUMN `adjust_y` decimal\(6,2\) NOT NULL DEFAULT 0/],
        [
          'adjust_scale',
          /ADD COLUMN `adjust_scale` decimal\(4,2\) NOT NULL DEFAULT 1/,
        ],
      ];
      for (const [column, pattern] of expected) {
        const statement = statements
          .map(normalize)
          .find(
            (s) =>
              /^ALTER TABLE `cosmetic_item`/.test(s) &&
              s.includes(`\`${column}\``) &&
              /ADD COLUMN/.test(s),
          );
        expect({ column, found: Boolean(statement) }).toEqual({
          column,
          found: true,
        });
        expect(sql).toMatch(pattern);
      }
    });

    it('alarga os enums type e rarity mantendo os valores antigos', async () => {
      const { runner, statements } = fakeRunner();
      await migration.up(runner as never);
      const sql = allSql(statements);
      expect(sql).toMatch(
        /ALTER TABLE `cosmetic_item` MODIFY COLUMN `type` enum\('frame','background','title','badge','effect','skin','head','face','neck','card'\) .*NOT NULL/,
      );
      expect(sql).toMatch(
        /ALTER TABLE `cosmetic_item` MODIFY COLUMN `rarity` enum\('common','uncommon','rare','epic','legendary','festive'\) .*NOT NULL/,
      );
    });

    it('adiciona color e acquired_kit_id em usuario_cosmetic', async () => {
      const { runner, statements } = fakeRunner();
      await migration.up(runner as never);
      const sql = allSql(statements);
      expect(sql).toMatch(
        /ALTER TABLE `usuario_cosmetic` ADD COLUMN `color` varchar\(7\) .*NULL/,
      );
      expect(sql).toMatch(
        /ALTER TABLE `usuario_cosmetic` ADD COLUMN `acquired_kit_id` int NULL/,
      );
    });

    it('cria cosmetic_kit e usuario_cosmetic_kit com único (usuario_id, kit_id)', async () => {
      const { runner, statements } = fakeRunner();
      await migration.up(runner as never);
      const sql = allSql(statements);
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS `cosmetic_kit`/);
      expect(sql).toMatch(/`slug` varchar\(80\)/);
      expect(sql).toMatch(/`active` tinyint NOT NULL DEFAULT 0/);
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS `usuario_cosmetic_kit`/);
      expect(sql).toMatch(/UNIQUE KEY `\w+` \(`usuario_id`,`kit_id`\)/);
    });

    it('nomeia explicitamente as chaves estrangeiras novas', async () => {
      const { runner, statements } = fakeRunner();
      await migration.up(runner as never);
      const sql = allSql(statements);
      for (const name of [
        'fk_cosmetic_item_kit',
        'fk_usuario_cosmetic_acquired_kit',
        'fk_usuario_cosmetic_kit_usuario',
        'fk_usuario_cosmetic_kit_kit',
      ])
        expect(sql).toContain(`CONSTRAINT \`${name}\``);
    });

    it('nomeia índices e únicos das tabelas novas', async () => {
      const { runner, statements } = fakeRunner();
      await migration.up(runner as never);
      const sql = allSql(statements);
      for (const name of [
        'ux_cosmetic_kit_slug',
        'ux_usuario_cosmetic_kit_usuario_kit',
        'ix_usuario_cosmetic_kit_kit',
      ])
        expect(sql).toContain(`KEY \`${name}\``);
    });

    it('migração e entidades declaram exatamente os mesmos nomes (synchronize local não os recria)', async () => {
      const { runner, statements } = fakeRunner();
      await migration.up(runner as never);
      const sql = allSql(statements);
      const names = (pattern: RegExp) =>
        [...sql.matchAll(pattern)].map((match) => match[1]).sort();
      const migrationForeignKeys = names(/CONSTRAINT `(\w+)` FOREIGN KEY/g);
      const migrationIndexes = names(/(?:UNIQUE )?KEY `(\w+)` \(/g);

      const source = new DataSource({
        type: 'mysql',
        database: 'somente-metadados', // nunca conecta: só monta os metadados
        entities: [
          CosmeticItem,
          CosmeticKit,
          UsuarioCosmetic,
          UsuarioCosmeticKit,
          Usuario,
          Empresa,
        ],
      });
      await (
        source as unknown as { buildMetadatas(): Promise<void> }
      ).buildMetadatas();
      const kitSide = [
        CosmeticItem,
        CosmeticKit,
        UsuarioCosmetic,
        UsuarioCosmeticKit,
      ]
        .map((entity) => source.getMetadata(entity))
        .map((metadata) => ({
          table: metadata.tableName,
          foreignKeys: metadata.foreignKeys.map((fk) => fk.name),
          indices: metadata.indices.map((index) => index.name),
        }));
      const entityForeignKeys = kitSide
        .flatMap((entity) => entity.foreignKeys)
        .filter((name) => migrationForeignKeys.includes(name))
        .sort();
      expect(entityForeignKeys).toEqual(migrationForeignKeys);
      const entityIndexes = kitSide
        .flatMap((entity) => entity.indices)
        .filter((name) => migrationIndexes.includes(name))
        .sort();
      expect(entityIndexes).toEqual(migrationIndexes);
      // nenhuma FK/índice da tabela nova fica com nome gerado (IDX_/FK_/UQ_)
      for (const entity of kitSide.filter((e) =>
        ['cosmetic_kit', 'usuario_cosmetic_kit'].includes(e.table),
      )) {
        for (const name of [...entity.foreignKeys, ...entity.indices])
          expect(name).not.toMatch(/^(IDX|FK|UQ|REL)_/);
      }
    });

    it('nunca apaga nem reescreve dados existentes', async () => {
      const { runner, statements } = fakeRunner();
      await migration.up(runner as never);
      const sql = allSql(statements);
      // `ON UPDATE CURRENT_TIMESTAMP` é cláusula de coluna: o que se proíbe é a instrução.
      for (const statement of statements.map(normalize)) {
        expect(statement).not.toMatch(/^(DELETE|UPDATE|TRUNCATE|DROP)\b/i);
        expect(statement).not.toMatch(/^INSERT\b/i);
      }
      expect(sql).not.toMatch(/\bDELETE\b/i);
      expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i);
      expect(sql).not.toMatch(/\bTRUNCATE\b/i);
      expect(sql).not.toMatch(/\bDROP\s+COLUMN\b/i);
    });

    it('é idempotente: não repete coluna que já existe (synchronize local)', async () => {
      const { runner, statements } = fakeRunner({
        columns: ['cosmetic_item.layer', 'usuario_cosmetic.color'],
      });
      await migration.up(runner as never);
      const sql = allSql(statements);
      expect(sql).not.toMatch(/ADD COLUMN `layer`/);
      expect(sql).not.toMatch(/ADD COLUMN `color`/);
      expect(sql).toMatch(/ADD COLUMN `art_key`/);
    });
  });

  describe('down', () => {
    it('remove só o que o up criou, em ordem segura', async () => {
      const { runner, statements } = fakeRunner({
        columns: [
          'cosmetic_item.kit_id',
          'cosmetic_item.festive_event',
          'cosmetic_item.available_from',
          'cosmetic_item.available_until',
          'cosmetic_item.unlock_rule',
          'cosmetic_item.art_key',
          'cosmetic_item.art_mime',
          'cosmetic_item.layer',
          'cosmetic_item.recolorable',
          'cosmetic_item.adjust_x',
          'cosmetic_item.adjust_y',
          'cosmetic_item.adjust_scale',
          'usuario_cosmetic.color',
          'usuario_cosmetic.acquired_kit_id',
        ],
        tables: ['cosmetic_kit', 'usuario_cosmetic_kit'],
        constraints: [
          'fk_cosmetic_item_kit',
          'fk_usuario_cosmetic_acquired_kit',
        ],
      });
      await migration.down(runner as never);
      const sql = allSql(statements);
      expect(sql).toMatch(/DROP FOREIGN KEY `fk_cosmetic_item_kit`/);
      expect(sql).toMatch(
        /DROP FOREIGN KEY `fk_usuario_cosmetic_acquired_kit`/,
      );
      expect(sql).toMatch(/DROP COLUMN `adjust_scale`/);
      expect(sql).toMatch(/DROP COLUMN `acquired_kit_id`/);
      expect(sql).toMatch(/DROP TABLE `usuario_cosmetic_kit`/);
      expect(sql).toMatch(/DROP TABLE `cosmetic_kit`/);
      expect(sql.indexOf('DROP TABLE `usuario_cosmetic_kit`')).toBeLessThan(
        sql.indexOf('DROP TABLE `cosmetic_kit`'),
      );
      expect(sql).toMatch(
        /MODIFY COLUMN `type` enum\('frame','background','title','badge','effect'\)/,
      );
      expect(sql).toMatch(
        /MODIFY COLUMN `rarity` enum\('common','uncommon','rare','epic','legendary'\)/,
      );
      expect(sql).not.toMatch(/\bDELETE\b/i);
      expect(sql).not.toMatch(/\bTRUNCATE\b/i);
      expect(sql).not.toMatch(/DROP TABLE `(cosmetic_item|usuario_cosmetic)`/);
    });

    it.each([
      [
        'compras em usuario_cosmetic_kit',
        { kitPurchases: 2 },
        /usuario_cosmetic_kit/,
      ],
      ['kits em cosmetic_kit', { kits: 1 }, /cosmetic_kit/],
      ['usuario_cosmetic.color preenchido', { ownedColor: 4 }, /color/],
      [
        'item antigo com art_key preenchido',
        { itemData: { art_key: 2 } },
        /cosmetic_item com art_key/,
      ],
      [
        'item antigo com unlock_rule preenchido',
        { itemData: { unlock_rule: 1 } },
        /cosmetic_item com unlock_rule/,
      ],
      [
        'item antigo com janela de venda preenchida',
        { itemData: { available_until: 3 } },
        /cosmetic_item com available_until/,
      ],
      [
        'item com festive_event ou kit_id preenchido',
        { itemData: { festive_event: 1, kit_id: 1 } },
        /cosmetic_item com kit_id/,
      ],
      [
        'item antigo com art_mime preenchido',
        { itemData: { art_mime: 1 } },
        /cosmetic_item com art_mime/,
      ],
      [
        'item antigo com layer diferente de front',
        { itemNonDefault: { layer: 1 } },
        /cosmetic_item com layer diferente do padrão/,
      ],
      [
        'item antigo recolorível',
        { itemNonDefault: { recolorable: 2 } },
        /cosmetic_item com recolorable diferente do padrão/,
      ],
      [
        'item antigo com ajuste de posição ou escala',
        { itemNonDefault: { adjust_x: 1 } },
        /cosmetic_item com adjust_x diferente do padrão/,
      ],
      [
        'item antigo com escala diferente de 1',
        { itemNonDefault: { adjust_scale: 1 } },
        /cosmetic_item com adjust_scale diferente do padrão/,
      ],
      [
        'usuario_cosmetic.acquired_kit_id preenchido',
        { ownedKit: 5 },
        /acquired_kit_id/,
      ],
    ] as [string, FakeOptions, RegExp][])(
      'recusa a reversão, sem alterar nada, com %s',
      async (_label, options, pattern) => {
        const { runner, statements } = fakeRunner({
          ...options,
          tables: ['cosmetic_kit', 'usuario_cosmetic_kit'],
          columns: [
            'usuario_cosmetic.color',
            'usuario_cosmetic.acquired_kit_id',
            ...[
              'unlock_rule',
              'art_key',
              'art_mime',
              'layer',
              'recolorable',
              'adjust_x',
              'adjust_y',
              'adjust_scale',
              'available_from',
              'available_until',
              'festive_event',
              'kit_id',
            ].map((column) => `cosmetic_item.${column}`),
          ],
        });
        await expect(migration.down(runner as never)).rejects.toThrow(
          /Reversão bloqueada/,
        );
        await expect(migration.down(runner as never)).rejects.toThrow(pattern);
        expect(allSql(statements)).not.toMatch(/\b(ALTER|DROP)\b/i);
      },
    );

    it('falha com mensagem clara, sem alterar nada, se há linhas com valores novos', async () => {
      const { runner, statements } = fakeRunner({
        newValueRows: 3,
        columns: ['cosmetic_item.layer'],
        tables: ['cosmetic_kit'],
      });
      await expect(migration.down(runner as never)).rejects.toThrow(
        /reversão|valores novos|festive/i,
      );
      const sql = allSql(statements);
      expect(sql).not.toMatch(/\b(ALTER|DROP)\b/i);
    });
  });
});
