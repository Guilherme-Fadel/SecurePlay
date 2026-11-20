import { Logger } from '@nestjs/common';
import { CosmeticType } from './entities/cosmetic-item.entity';
import { loadLooks } from './look';

const row = (
  usuario_id: number,
  type: CosmeticType,
  visual_value: string,
  extra: Record<string, unknown> = {},
) => ({
  usuario_id,
  equipped: true,
  color: null,
  cosmetic_item: {
    id: 900 + usuario_id,
    slug: `slug-${visual_value}`,
    name: 'Nome interno',
    price: 500,
    type,
    visual_value,
    art_key: null,
    adjust_x: 0,
    adjust_y: 0,
    adjust_scale: 1,
    layer: 'front',
    ...extra,
  },
});

const build = (rows: unknown[], resolve = jest.fn()) => {
  const find = jest.fn().mockResolvedValue(rows);
  const logger = { warn: jest.fn() } as unknown as Logger;
  return {
    find,
    resolve,
    deps: {
      userItems: { find } as never,
      s3: { resolveImageUrl: resolve },
      logger,
    },
  };
};

describe('loadLooks', () => {
  it('monta a peça equipada de cada aluno com uma única consulta', async () => {
    const { find, deps } = build([
      row(1, CosmeticType.HEAD, 'cartola', {
        adjust_y: -4,
        adjust_scale: 1.2,
        layer: null,
      }),
      row(2, CosmeticType.SKIN, 'verde'),
    ]);
    const looks = await loadLooks(deps, [1, 2, 3]);
    expect(find).toHaveBeenCalledTimes(1);
    expect(looks.get(1)).toEqual({
      head: {
        visualValue: 'cartola',
        artUrl: null,
        color: null,
        adjust: { x: 0, y: -4, scale: 1.2 },
        layer: 'front',
      },
    });
    expect(looks.get(2)?.skin?.visualValue).toBe('verde');
    expect(looks.get(3)).toEqual({});
  });

  it('só inclui encaixes do personagem e só peças equipadas, sem campos internos', async () => {
    const { find, deps } = build([
      row(1, CosmeticType.FRAME, 'ouro'),
      row(1, CosmeticType.TITLE, 'lenda'),
      row(1, CosmeticType.BADGE, 'estrela'),
      { ...row(1, CosmeticType.FACE, 'oculos'), equipped: false },
      row(1, CosmeticType.CARD, 'neon', { layer: 'back' }),
    ]);
    const [look] = [(await loadLooks(deps, [1])).get(1)];
    expect(Object.keys(look ?? {})).toEqual(['card']);
    expect(look?.card?.layer).toBe('back');
    expect(JSON.stringify(look)).not.toMatch(
      /slug|price|Nome interno|"id"|usuario/,
    );
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ equipped: true }) as object,
      }),
    );
  });

  it('resolve a arte enviada e cai em null quando o S3 falha', async () => {
    const resolve = jest.fn((key: string) =>
      key === 'ok'
        ? Promise.resolve('https://cdn/ok.png')
        : Promise.reject(new Error('s3')),
    );
    const { deps } = build(
      [
        row(1, CosmeticType.HEAD, 'a', { art_key: 'ok' }),
        row(1, CosmeticType.NECK, 'b', { art_key: 'ruim' }),
      ],
      resolve,
    );
    const look = (await loadLooks(deps, [1])).get(1);
    expect(look?.head?.artUrl).toBe('https://cdn/ok.png');
    expect(look?.neck?.artUrl).toBeNull();
  });

  it('não consulta o banco sem alunos', async () => {
    const { find, deps } = build([]);
    expect((await loadLooks(deps, [])).size).toBe(0);
    expect(find).not.toHaveBeenCalled();
  });
});
