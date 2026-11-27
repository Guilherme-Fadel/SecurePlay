import { AdminCollectiblesService } from '../../src/achievements/admin-collectibles.service';
import {
  CosmeticItem,
  CosmeticType,
} from '../../src/achievements/entities/cosmetic-item.entity';
import { CosmeticRarity } from '../../src/achievements/entities/cosmetic-rarity';
import type { CollectibleItemDto } from '../../src/achievements/dto/collectible-item.dto';
import type { CollectibleKitDto } from '../../src/achievements/dto/collectible-kit.dto';
import { CosmeticKit } from '../../src/achievements/entities/cosmetic-kit.entity';

type Row = Record<string, unknown> & { id?: number };

/** Banco em memória mínimo para os testes do cadastro: igualdade simples em `where`, sem relações. */
export function fakeCollectiblesDb() {
  const tables = new Map<unknown, Row[]>([
    [CosmeticItem, []],
    [CosmeticKit, []],
  ]);
  let seq = 100;
  const matches = (row: Row, where: Row | undefined) =>
    Object.entries(where ?? {}).every(([key, value]) =>
      typeof value === 'object'
        ? (value as { type?: string }).type !== 'isNull' ||
          row[key] === null ||
          row[key] === undefined
        : row[key] === value,
    );
  const repository = (entity: unknown) => {
    const rows = tables.get(entity)!;
    const saveOne = (value: Row): Promise<Row> => {
      if (!value.id) {
        value.id = seq++;
        rows.push(value);
      }
      return Promise.resolve(value);
    };
    return {
      create: (value: Row) => ({ ...value }),
      save: jest.fn((value: Row | Row[]) =>
        Array.isArray(value) ? Promise.all(value.map(saveOne)) : saveOne(value),
      ),
      findOne: ({ where }: { where: Row }) =>
        Promise.resolve(rows.find((row) => matches(row, where)) ?? null),
      find: ({ where }: { where?: Row } = {}) =>
        Promise.resolve(rows.filter((row) => matches(row, where))),
      findAndCount: ({ where }: { where?: Row | Row[] } = {}) => {
        const list = Array.isArray(where) ? where : [where];
        const found = rows.filter((row) =>
          list.some((one) => matches(row, one)),
        );
        return Promise.resolve([found, found.length] as const);
      },
    };
  };
  const repositories = new Map<unknown, ReturnType<typeof repository>>();
  const manager = {
    getRepository: (entity: unknown) => {
      if (!repositories.has(entity)) {
        repositories.set(entity, repository(entity));
      }
      return repositories.get(entity)!;
    },
  };
  const dataSource = {
    getRepository: manager.getRepository,
    transaction: async <T>(work: (m: typeof manager) => Promise<T>) =>
      work(manager),
  };
  return {
    manager,
    dataSource,
    items: tables.get(CosmeticItem)!,
    kits: tables.get(CosmeticKit)!,
  };
}

export const art = (n = 1) =>
  `s3://media/collectibles/3f2b8c1e-9a4d-4e7a-8b6c-0d1e2f3a4b5${n}.png`;
export const ACTOR = 9;

/** Cabeçalho de PNG com as dimensões dadas (o bastante para a validação de formato). */
export function pngHeader(width: number, height: number) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

export function setup() {
  const db = fakeCollectiblesDb();
  const audit = { registrar: jest.fn().mockResolvedValue(undefined) };
  const s3 = {
    resolveImageUrl: jest.fn((key: string) =>
      Promise.resolve(`https://signed/${key}`),
    ),
    headObject: jest
      .fn()
      .mockResolvedValue({ contentLength: 1, contentType: '' }),
    getObjectBuffer: jest.fn().mockResolvedValue(pngHeader(956, 1080)),
    toS3Uri: (key: string) => `s3://media/${key}`,
  };
  const service = new AdminCollectiblesService(
    db.dataSource as never,
    audit as never,
    s3 as never,
  );
  return { db, audit, s3, service };
}

export const kitDto = (
  overrides: Partial<CollectibleKitDto> = {},
): CollectibleKitDto => ({
  name: 'Kit de Natal',
  slug: 'kit-natal',
  description: 'Visual de fim de ano',
  rarity: CosmeticRarity.RARE,
  price: 6,
  pieces: [
    { type: 'head', name: 'Gorro', artKey: art(1) },
    { type: 'face', name: 'Barba', artKey: art(2) },
  ],
  ...overrides,
});

export const itemDto = (
  overrides: Partial<CollectibleItemDto> = {},
): CollectibleItemDto => ({
  name: 'Moldura azul',
  slug: 'moldura-azul',
  description: 'Moldura',
  type: CosmeticType.HEAD,
  rarity: CosmeticRarity.COMMON,
  price: 2,
  visualValue: 'blue',
  ...overrides,
});
