import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminCollectiblesService } from './admin-collectibles.service';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';

const ACTOR = 9;
const art = (n: number) => `s3://media/collectibles/art-${n}.png`;

type Item = {
  id: number;
  slug: string;
  kit_id: number | null;
  art_key: string | null;
};

function setup(
  data: {
    items?: Item[];
    kits?: { id: number; slug: string }[];
    owned?: { usuario_id: number; cosmetic_item_id: number }[];
    bought?: { usuario_id: number; kit_id: number }[];
  } = {},
) {
  const items = data.items ?? [];
  const kits = data.kits ?? [];
  const owned = data.owned ?? [];
  const bought = data.bought ?? [];
  const order: string[] = [];
  const itemRepo = {
    findOne: jest.fn(({ where }: { where: { id: number } }) =>
      Promise.resolve(items.find((i) => i.id === where.id) ?? null),
    ),
    find: jest.fn(({ where }: { where: { kit_id: number } }) =>
      Promise.resolve(items.filter((i) => i.kit_id === where.kit_id)),
    ),
    delete: jest.fn((where: { id?: number; kit_id?: number }) => {
      order.push(`delete item ${JSON.stringify(where)}`);
      for (let i = items.length - 1; i >= 0; i--) {
        const row = items[i];
        if (row.id === where.id || row.kit_id === where.kit_id) {
          items.splice(i, 1);
        }
      }
      return Promise.resolve();
    }),
    count: jest.fn(({ where }: { where: { art_key: string } }) =>
      Promise.resolve(items.filter((i) => i.art_key === where.art_key).length),
    ),
  };
  const kitRepo = {
    findOne: jest.fn(({ where }: { where: { id: number } }) =>
      Promise.resolve(kits.find((k) => k.id === where.id) ?? null),
    ),
    delete: jest.fn((where: { id: number }) => {
      order.push(`delete kit ${where.id}`);
      return Promise.resolve();
    }),
  };
  const ownedRepo = {
    find: jest.fn(
      ({
        where,
      }: {
        where: { cosmetic_item_id: number | { _value: number[] } };
      }) => {
        const ids =
          typeof where.cosmetic_item_id === 'object'
            ? where.cosmetic_item_id._value
            : [where.cosmetic_item_id];
        return Promise.resolve(
          owned.filter((o) => ids.includes(o.cosmetic_item_id)),
        );
      },
    ),
  };
  const boughtRepo = {
    find: jest.fn(({ where }: { where: { kit_id: number } }) =>
      Promise.resolve(bought.filter((b) => b.kit_id === where.kit_id)),
    ),
  };
  const repos = new Map<unknown, unknown>([
    [CosmeticItem, itemRepo],
    [CosmeticKit, kitRepo],
    [UsuarioCosmetic, ownedRepo],
    [UsuarioCosmeticKit, boughtRepo],
  ]);
  const manager = { getRepository: (entity: unknown) => repos.get(entity) };
  const dataSource = {
    getRepository: manager.getRepository,
    transaction: jest.fn(async <T>(work: (m: typeof manager) => Promise<T>) =>
      work(manager),
    ),
  };
  const audit = { registrar: jest.fn().mockResolvedValue(undefined) };
  const s3 = {
    toS3Uri: (key: string) => `s3://media/${key}`,
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AdminCollectiblesService(
    dataSource as never,
    audit as never,
    s3 as never,
  );
  return {
    service,
    audit,
    s3,
    itemRepo,
    kitRepo,
    items,
    order,
    manager,
    dataSource,
  };
}

const piece = (id: number, kit: number, n = id): Item => ({
  id,
  slug: `peca-${id}`,
  kit_id: kit,
  art_key: art(n),
});

describe('AdminCollectiblesService — exclusão', () => {
  it('exclui item livre, audita e apaga a arte', async () => {
    const ctx = setup({
      items: [{ id: 1, slug: 'moldura', kit_id: null, art_key: art(1) }],
    });
    await expect(ctx.service.remove(ACTOR, 'items', 1)).resolves.toEqual({
      ok: true,
    });
    expect(ctx.itemRepo.delete).toHaveBeenCalledWith({ id: 1 });
    expect(ctx.audit.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'collectible.deleted',
        alvoTipo: 'collectible_item',
        alvoId: 1,
        atorId: ACTOR,
        detalhes: { slug: 'moldura' },
      }),
      ctx.manager,
    );
    expect(ctx.s3.deleteObject).toHaveBeenCalledWith('collectibles/art-1.png');
  });

  it('item inexistente vira 404', async () => {
    const { service } = setup();
    await expect(service.remove(ACTOR, 'items', 5)).rejects.toThrow(
      new NotFoundException('Colecionável não encontrado.'),
    );
    await expect(service.remove(ACTOR, 'kits', 5)).rejects.toThrow(
      new NotFoundException('Colecionável não encontrado.'),
    );
  });

  it('peça de kit não se exclui avulsa', async () => {
    const ctx = setup({ items: [piece(2, 7)], kits: [{ id: 7, slug: 'k' }] });
    await expect(ctx.service.remove(ACTOR, 'items', 2)).rejects.toThrow(
      new BadRequestException(
        'Esta peça faz parte de um kit: exclua o kit ou tire a peça dele.',
      ),
    );
    expect(ctx.itemRepo.delete).not.toHaveBeenCalled();
  });

  it('item com dono vira 409 com contagem no singular e no plural', async () => {
    const one = setup({
      items: [{ id: 1, slug: 'a', kit_id: null, art_key: null }],
      owned: [{ usuario_id: 1, cosmetic_item_id: 1 }],
    });
    await expect(one.service.remove(ACTOR, 'items', 1)).rejects.toThrow(
      new ConflictException(
        '1 aluno já tem este item. Tire da loja em vez de excluir.',
      ),
    );
    const three = setup({
      items: [{ id: 1, slug: 'a', kit_id: null, art_key: null }],
      owned: [1, 2, 3].map((u) => ({ usuario_id: u, cosmetic_item_id: 1 })),
    });
    await expect(three.service.remove(ACTOR, 'items', 1)).rejects.toThrow(
      new ConflictException(
        '3 alunos já têm este item. Tire da loja em vez de excluir.',
      ),
    );
    expect(three.itemRepo.delete).not.toHaveBeenCalled();
    expect(three.audit.registrar).not.toHaveBeenCalled();
    expect(three.s3.deleteObject).not.toHaveBeenCalled();
  });

  it('kit livre exclui peças e kit, audita e apaga a arte de cada peça', async () => {
    const ctx = setup({
      kits: [{ id: 7, slug: 'kit-natal' }],
      items: [piece(2, 7), piece(3, 7)],
    });
    await expect(ctx.service.remove(ACTOR, 'kits', 7)).resolves.toEqual({
      ok: true,
    });
    expect(ctx.order).toEqual(['delete item {"kit_id":7}', 'delete kit 7']);
    expect(ctx.audit.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'collectible.deleted',
        alvoTipo: 'collectible_kit',
        alvoId: 7,
        detalhes: { slug: 'kit-natal' },
      }),
      ctx.manager,
    );
    expect(ctx.s3.deleteObject).toHaveBeenCalledTimes(2);
  });

  it('kit com comprador vira 409', async () => {
    const ctx = setup({
      kits: [{ id: 7, slug: 'k' }],
      items: [piece(2, 7)],
      bought: [{ usuario_id: 1, kit_id: 7 }],
    });
    await expect(ctx.service.remove(ACTOR, 'kits', 7)).rejects.toThrow(
      new ConflictException(
        '1 aluno já tem este item. Tire da loja em vez de excluir.',
      ),
    );
    expect(ctx.kitRepo.delete).not.toHaveBeenCalled();
  });

  it('kit com dono de peça vira 409 e conta alunos distintos', async () => {
    const ctx = setup({
      kits: [{ id: 7, slug: 'k' }],
      items: [piece(2, 7), piece(3, 7)],
      bought: [{ usuario_id: 1, kit_id: 7 }],
      owned: [
        { usuario_id: 1, cosmetic_item_id: 2 },
        { usuario_id: 1, cosmetic_item_id: 3 },
        { usuario_id: 4, cosmetic_item_id: 3 },
      ],
    });
    await expect(ctx.service.remove(ACTOR, 'kits', 7)).rejects.toThrow(
      new ConflictException(
        '2 alunos já têm este item. Tire da loja em vez de excluir.',
      ),
    );
    expect(ctx.itemRepo.delete).not.toHaveBeenCalled();
  });

  it('recusa do banco por chave estrangeira vira 409, não 500', async () => {
    const ctx = setup({
      items: [{ id: 1, slug: 'a', kit_id: null, art_key: null }],
    });
    ctx.itemRepo.delete.mockRejectedValueOnce(
      Object.assign(new Error('fk'), {
        driverError: { code: 'ER_ROW_IS_REFERENCED_2' },
      }),
    );
    await expect(ctx.service.remove(ACTOR, 'items', 1)).rejects.toBeInstanceOf(
      ConflictException,
    );
    ctx.itemRepo.delete.mockRejectedValueOnce(new Error('conexão perdida'));
    await expect(ctx.service.remove(ACTOR, 'items', 1)).rejects.toThrow(
      'conexão perdida',
    );
  });

  it('só apaga a arte que nenhum outro item usa', async () => {
    const shared = art(1);
    const ctx = setup({
      items: [
        { id: 1, slug: 'a', kit_id: null, art_key: shared },
        { id: 2, slug: 'b', kit_id: null, art_key: shared },
      ],
    });
    await ctx.service.remove(ACTOR, 'items', 1);
    expect(ctx.s3.deleteObject).not.toHaveBeenCalled();

    const alone = setup({
      items: [{ id: 1, slug: 'a', kit_id: null, art_key: art(2) }],
    });
    await alone.service.remove(ACTOR, 'items', 1);
    expect(alone.s3.deleteObject).toHaveBeenCalledWith(
      'collectibles/art-2.png',
    );
  });

  it('falha do S3 só vai para o log e a resposta segue ok', async () => {
    const ctx = setup({
      items: [{ id: 1, slug: 'a', kit_id: null, art_key: art(1) }],
    });
    ctx.s3.deleteObject.mockRejectedValueOnce(new Error('S3 fora'));
    const warn = jest
      .spyOn(
        (ctx.service as unknown as { logger: { warn: () => void } }).logger,
        'warn',
      )
      .mockImplementation(() => undefined);
    await expect(ctx.service.remove(ACTOR, 'items', 1)).resolves.toEqual({
      ok: true,
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('collectibles/');
  });
});
