export type FakeOptions = {
  columns?: string[]; // "tabela.coluna" já existentes
  tables?: string[];
  newValueRows?: number; // linhas de cosmetic_item usando valores novos dos enums
  constraints?: string[]; // nomes de FK existentes
  kitPurchases?: number; // linhas em usuario_cosmetic_kit
  kits?: number; // linhas em cosmetic_kit
  ownedColor?: number; // usuario_cosmetic com color preenchido
  ownedKit?: number; // usuario_cosmetic com acquired_kit_id preenchido
  itemData?: Record<string, number>; // cosmetic_item com a coluna nova preenchida
  itemNonDefault?: Record<string, number>; // cosmetic_item com a coluna fora do padrão
};

function countFor(sql: string, options: FakeOptions) {
  const itemColumn = /FROM `cosmetic_item` WHERE `(\w+)` IS NOT NULL/.exec(sql);
  if (itemColumn) return options.itemData?.[itemColumn[1]];
  const nonDefault = /FROM `cosmetic_item` WHERE `(\w+)` <> /.exec(sql);
  if (nonDefault) return options.itemNonDefault?.[nonDefault[1]];
  if (sql.includes('FROM `usuario_cosmetic_kit`')) return options.kitPurchases;
  if (sql.includes('FROM `cosmetic_kit`')) return options.kits;
  if (sql.includes('`color` IS NOT NULL')) return options.ownedColor;
  if (sql.includes('`acquired_kit_id` IS NOT NULL')) return options.ownedKit;
  return options.newValueRows;
}

/** queryRunner falso: registra todo SQL emitido sem tocar em banco. */
export function fakeRunner(options: FakeOptions = {}) {
  const statements: string[] = [];
  const runner = {
    query: jest.fn((sql: string) => {
      statements.push(sql);
      if (/TABLE_CONSTRAINTS/i.test(sql)) {
        const present = (options.constraints ?? []).some((name) =>
          sql.includes(`'${name}'`),
        );
        return Promise.resolve([{ total: present ? 1 : 0 }]);
      }
      if (/^\s*SELECT/i.test(sql))
        return Promise.resolve([{ total: countFor(sql, options) ?? 0 }]);
      return Promise.resolve();
    }),
    hasColumn: jest.fn((table: string, column: string) =>
      Promise.resolve((options.columns ?? []).includes(`${table}.${column}`)),
    ),
    hasTable: jest.fn((table: string) =>
      Promise.resolve((options.tables ?? []).includes(table)),
    ),
  };
  return { runner, statements };
}
