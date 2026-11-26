import { Logger } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CosmeticType } from './entities/cosmetic-item.entity';
import { CosmeticRarity } from './entities/cosmetic-rarity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';
import { defaultCharacterColor } from './character-color';
import type { UnlockFacts } from './unlock-evaluator';
import { rankKey } from '../dashboard/rank-key';
import { Usuario } from '../usuario/usuario.entity';

const facts: UnlockFacts = {
  xpSeason: 0,
  xpTotal: 0,
  accessDays: 0,
  streak: 3,
  unlockedAchievements: new Set<string>(),
  rank: { empresa: null, global: null },
};

const piece = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  slug: `peca-${id}`,
  name: `Peça ${id}`,
  description: 'd',
  type: CosmeticType.HEAD,
  rarity: CosmeticRarity.RARE,
  price: 0,
  visual_value: `v${id}`,
  required_achievement_slug: null,
  active: true,
  kit_id: 3,
  festive_event: null,
  available_from: null,
  available_until: null,
  unlock_rule: null,
  art_key: `arte/${id}.png`,
  layer: 'front',
  recolorable: false,
  adjust_x: 0,
  adjust_y: 0,
  adjust_scale: 1,
  ...overrides,
});

const past = new Date(Date.now() - 86_400_000);

function setup() {
  const streak5 = {
    mode: 'all',
    conditions: [{ metric: 'streak', min: 5 }],
  };
  const catalog = {
    // avulsos: um à venda com regra, um fora do período, e uma peça de kit já possuída.
    shop: [
      piece(1, {
        kit_id: null,
        price: 4,
        unlock_rule: streak5,
        recolorable: true,
        festive_event: 'natal',
        available_until: new Date(Date.now() + 86_400_000),
      }),
      piece(2, { kit_id: null, available_until: past }),
      piece(11, { type: CosmeticType.FACE }),
    ],
    kits: [
      {
        id: 3,
        slug: 'kit-natal',
        name: 'Kit de Natal',
        description: 'kit',
        rarity: CosmeticRarity.FESTIVE,
        price: 6,
        festive_event: 'natal',
        available_from: null,
        available_until: null,
        unlock_rule: null,
        active: true,
        pieces: [
          piece(11, { type: CosmeticType.FACE }),
          piece(12),
          // Peça removida do kit pelo console: arquivada e com a marca de saída.
          piece(13, { active: false, available_until: past }),
          piece(14, { active: false }),
        ],
      },
      {
        id: 4,
        slug: 'kit-velho',
        name: 'Kit Velho',
        description: 'kit',
        rarity: CosmeticRarity.COMMON,
        price: 1,
        festive_event: null,
        available_from: null,
        available_until: past,
        unlock_rule: null,
        active: true,
        pieces: [],
      },
    ],
  };
  const ownedPiece = {
    id: 90,
    usuario_id: 7,
    cosmetic_item_id: 11,
    equipped: true,
    color: '#AA00FF',
    cosmetic_item: catalog.shop[2],
  };
  const cosmetics = { find: jest.fn().mockResolvedValue(catalog.shop) };
  const userCosmetics = { find: jest.fn().mockResolvedValue([ownedPiece]) };
  const kits = { find: jest.fn().mockResolvedValue(catalog.kits) };
  const ownedKits = {
    find: jest.fn().mockResolvedValue([{ usuario_id: 7, kit_id: 4 }]),
  };
  const usuarios = {
    findOne: jest.fn().mockResolvedValue({ id: 7, character_color: null }),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    getRepository: jest.fn((entity: unknown) =>
      entity === UsuarioCosmeticKit
        ? ownedKits
        : entity === Usuario
          ? usuarios
          : kits,
    ),
  };
  const loader = { load: jest.fn().mockResolvedValue(facts) };
  const s3 = {
    resolveImageUrl: jest.fn((key: string | null) =>
      Promise.resolve(key ? `https://cdn.test/${key}` : null),
    ),
  };
  const service = new AchievementsService(
    cosmetics as never,
    userCosmetics as never,
    dataSource as never,
    undefined,
    loader as never,
    s3 as never,
  );
  jest.spyOn(service, 'getTrail').mockResolvedValue({
    summary: { prestigeBalance: 5 },
    metrics: {},
    nodes: [],
  } as never);
  return { service, loader, s3, cosmetics, kits, usuarios };
}

describe('AchievementsService.getShop', () => {
  it('monta saldo, equipados, avulsos e kits conforme o contrato', async () => {
    const { service } = setup();
    const shop = await service.getShop(7);

    expect(shop.prestigeBalance).toBe(5);
    expect(shop.equipped).toEqual([
      {
        type: CosmeticType.FACE,
        slug: 'peca-11',
        visualValue: 'v11',
        artUrl: 'https://cdn.test/arte/11.png',
        color: '#AA00FF',
        adjust: { x: 0, y: 0, scale: 1 },
        layer: 'front',
      },
    ]);

    // O avulso 2 saiu de venda e não é possuído: não aparece.
    expect(shop.items.map((item) => item.id)).toEqual([1, 11]);
    const sale = shop.items[0];
    expect(sale).toMatchObject({
      slug: 'peca-1',
      price: 4,
      artUrl: 'https://cdn.test/arte/1.png',
      recolorable: true,
      festiveEvent: 'natal',
      owned: false,
      equipped: false,
      color: null,
      affordable: true,
      requiredAchievementSlug: null,
      requirementMet: false,
    });
    expect(sale.availableUntil).toEqual(expect.any(String));
    expect(sale.unlock).toMatchObject({
      met: false,
      conditions: [{ metric: 'streak', current: 3, target: 5, met: false }],
    });
    // Peça de kit que o aluno já tem aparece como possuída e equipada.
    expect(shop.items[1]).toMatchObject({
      owned: true,
      equipped: true,
      color: '#AA00FF',
      unlock: { met: true, conditions: [] },
      requirementMet: true,
    });

    // O kit 4 está fora do período mas é possuído (owned=true); o kit 3 está à venda.
    expect(shop.kits.map((kit) => kit.id)).toEqual([3, 4]);
    expect(shop.kits[0]).toMatchObject({
      slug: 'kit-natal',
      price: 6,
      festiveEvent: 'natal',
      owned: false,
      affordable: false,
      unlock: { met: true, conditions: [] },
      pieces: [
        {
          id: 11,
          type: CosmeticType.FACE,
          name: 'Peça 11',
          visualValue: 'v11',
          artUrl: 'https://cdn.test/arte/11.png',
        },
        { id: 12, type: CosmeticType.HEAD, name: 'Peça 12' },
      ],
    });
    expect(shop.kits[1]).toMatchObject({ owned: true, affordable: true });
  });

  it('peças removidas ou inativas não aparecem no kit da loja', async () => {
    const { service } = setup();
    const shop = await service.getShop(7);
    expect(shop.kits[0].pieces.map((p) => p.id)).toEqual([11, 12]);
  });

  it('kit que o aluno já tem mostra só as peças dele, não as novas nem as arquivadas depois', async () => {
    const { service, kits } = setup();
    const owned = (id: number, overrides: Record<string, unknown> = {}) =>
      piece(id, { kit_id: 3, ...overrides });
    kits.find.mockResolvedValue([
      {
        id: 4,
        slug: 'kit-velho',
        name: 'Kit Velho',
        description: 'kit',
        rarity: CosmeticRarity.COMMON,
        price: 1,
        festive_event: null,
        available_from: null,
        available_until: null,
        unlock_rule: null,
        active: false,
        // 11 é do aluno; 21 entrou no kit depois da compra; 22 foi arquivada.
        pieces: [
          owned(11, { type: CosmeticType.FACE }),
          owned(21),
          owned(22, { active: false, available_until: past }),
        ],
      },
    ]);
    const shop = await service.getShop(7);
    // O kit 4 é do aluno (mesmo arquivado) e ele possui só a peça 11.
    expect(shop.kits).toHaveLength(1);
    expect(shop.kits[0]).toMatchObject({ id: 4, owned: true });
    expect(shop.kits[0].pieces.map((p) => p.id)).toEqual([11]);
  });

  it('modo any com conquista legada: só a conquista é obrigatória e a colocação traz o escopo', async () => {
    const { service, cosmetics } = setup();
    cosmetics.find.mockResolvedValue([
      piece(5, {
        kit_id: null,
        required_achievement_slug: 'veterano',
        unlock_rule: {
          mode: 'any',
          conditions: [
            { metric: 'rank', top: 10, scope: 'global' },
            { metric: 'streak', min: 5 },
          ],
        },
      }),
    ]);
    const [item] = (await service.getShop(7)).items;
    expect(item.unlock.mode).toBe('any');
    expect(item.unlock.met).toBe(false);
    const [rank, streak, achievement] = item.unlock.conditions;
    expect(rank).toMatchObject({ metric: 'rank', scope: 'global', target: 10 });
    expect(rank).not.toHaveProperty('required');
    expect(streak).not.toHaveProperty('required');
    expect(achievement).toMatchObject({
      metric: 'achievement',
      target: 'veterano',
      required: true,
    });
    expect(item.requirementMet).toBe(false);
  });

  it('item e peça de kit expõem arte, ajuste, camada e recolorível', async () => {
    const { service, cosmetics, kits, s3 } = setup();
    const fit = {
      adjust_x: 1.5,
      adjust_y: -2,
      adjust_scale: 1.2,
      layer: 'back',
      recolorable: true,
    };
    cosmetics.find.mockResolvedValue([piece(6, { kit_id: null, ...fit })]);
    kits.find.mockResolvedValue([
      {
        id: 3,
        slug: 'kit',
        name: 'Kit',
        description: 'kit',
        rarity: CosmeticRarity.RARE,
        price: 1,
        festive_event: null,
        available_from: null,
        available_until: null,
        unlock_rule: null,
        active: true,
        // Mesma arte do avulso: precisa ser resolvida uma vez só.
        pieces: [piece(7, { ...fit, art_key: 'arte/6.png' })],
      },
    ]);
    const shop = await service.getShop(7);
    const expected = {
      artUrl: 'https://cdn.test/arte/6.png',
      adjust: { x: 1.5, y: -2, scale: 1.2 },
      layer: 'back',
      recolorable: true,
    };
    expect(shop.items[0]).toMatchObject(expected);
    expect(shop.kits[0].pieces[0]).toMatchObject(expected);
    expect(shop.kits[0].pieces[0]).not.toHaveProperty('art_key');
    const resolved = s3.resolveImageUrl.mock.calls.filter(
      ([key]) => key === 'arte/6.png',
    );
    expect(resolved).toHaveLength(1);
  });

  it('carrega os fatos de liberação uma vez só para todo o Shop', async () => {
    const { service, loader } = setup();
    await service.getShop(7);
    expect(loader.load).toHaveBeenCalledTimes(1);
    const [, needs] = loader.load.mock.calls[0] as [number, Set<string>];
    expect(needs).toEqual(new Set(['streak']));
  });

  it('falha ao resolver a arte não derruba o Shop (artUrl nula)', async () => {
    const { service, s3 } = setup();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    s3.resolveImageUrl.mockRejectedValue(new Error('s3 fora'));
    const shop = await service.getShop(7);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    expect(shop.items[0].artUrl).toBeNull();
    expect(shop.equipped[0].artUrl).toBeNull();
  });
});

describe('AchievementsService.getShop - cor base do personagem', () => {
  it('sem escolha traz a cor padrão da rankKey com chosen=false', async () => {
    const { service } = setup();
    const shop = await service.getShop(7);
    expect(shop.character).toEqual({
      color: defaultCharacterColor(rankKey(7)),
      chosen: false,
    });
  });

  it('com escolha traz a cor gravada com chosen=true', async () => {
    const { service, usuarios } = setup();
    usuarios.findOne.mockResolvedValue({ id: 7, character_color: 'rosa' });
    const shop = await service.getShop(7);
    expect(shop.character).toEqual({ color: 'rosa', chosen: true });
  });

  it('ignora valor inválido gravado e volta à cor padrão', async () => {
    const { service, usuarios } = setup();
    usuarios.findOne.mockResolvedValue({ id: 7, character_color: 'verde' });
    expect((await service.getShop(7)).character.chosen).toBe(false);
  });
});

describe('AchievementsService.setCharacterColor', () => {
  it('grava a cor do aluno autenticado e devolve a loja com chosen=true', async () => {
    const { service, usuarios } = setup();
    usuarios.update.mockImplementation(() => {
      usuarios.findOne.mockResolvedValue({ id: 7, character_color: 'preto' });
      return Promise.resolve();
    });
    const shop = await service.setCharacterColor(7, 'preto');
    expect(usuarios.update).toHaveBeenCalledWith(
      { id: 7 },
      { character_color: 'preto' },
    );
    expect(shop.character).toEqual({ color: 'preto', chosen: true });
  });

  it.each(['verde', '', null, undefined, 3, 'AZUL'])(
    'recusa a cor %j com 400 sem gravar',
    async (color) => {
      const { service, usuarios } = setup();
      await expect(service.setCharacterColor(7, color)).rejects.toMatchObject({
        status: 400,
      });
      expect(usuarios.update).not.toHaveBeenCalled();
    },
  );
});
