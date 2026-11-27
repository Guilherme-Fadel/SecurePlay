import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CosmeticType } from './entities/cosmetic-item.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';
import type { UnlockFacts } from './unlock-evaluator';
import type { UnlockRule } from './unlock-rule';

const facts = (overrides: Partial<UnlockFacts> = {}): UnlockFacts => ({
  xpSeason: 0,
  xpTotal: 0,
  accessDays: 0,
  streak: 0,
  unlockedAchievements: new Set<string>(),
  rank: { empresa: null, global: null },
  ...overrides,
});

const streak5: UnlockRule = {
  mode: 'all',
  conditions: [{ metric: 'streak', min: 5 }],
};

const baseItem = {
  id: 10,
  slug: 'moldura',
  name: 'Moldura',
  type: CosmeticType.HEAD,
  price: 2,
  active: true,
  kit_id: null,
  required_achievement_slug: null,
  unlock_rule: null,
  available_from: null,
  available_until: null,
};

function setup(loaded: UnlockFacts = facts()) {
  const cosmetics = { findOne: jest.fn(), find: jest.fn() };
  const userCosmetics = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
  };
  const kits = { findOne: jest.fn(), find: jest.fn() };
  const ownedKits = { find: jest.fn().mockResolvedValue([]) };
  const dataSource = {
    transaction: jest.fn(),
    getRepository: jest.fn((entity: unknown) =>
      entity === UsuarioCosmeticKit ? ownedKits : kits,
    ),
  };
  const loader = { load: jest.fn().mockResolvedValue(loaded) };
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
  const trail = {
    summary: { prestigeBalance: 10 },
    metrics: {},
    nodes: [],
  };
  jest.spyOn(service, 'getTrail').mockResolvedValue(trail as never);
  const getShop = jest
    .spyOn(service, 'getShop')
    .mockResolvedValue({ shop: true } as never);
  return {
    service,
    cosmetics,
    userCosmetics,
    kits,
    ownedKits,
    dataSource,
    loader,
    s3,
    getShop,
  };
}

describe('AchievementsService.purchase (regras do Shop)', () => {
  it('peça de kit não é vendida avulsa', async () => {
    const s = setup();
    s.cosmetics.findOne.mockResolvedValue({ ...baseItem, kit_id: 4 });
    await expect(s.service.purchase(7, 10)).rejects.toThrow(
      new BadRequestException('Esta peça só vem com o kit'),
    );
    expect(s.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('item fora do período não é mais vendido', async () => {
    const s = setup();
    s.cosmetics.findOne.mockResolvedValue({
      ...baseItem,
      available_until: new Date(Date.now() - 60_000),
    });
    await expect(s.service.purchase(7, 10)).rejects.toThrow(
      new BadRequestException('Este item não está mais à venda'),
    );
    expect(s.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('item inexistente dá 404', async () => {
    const s = setup();
    s.cosmetics.findOne.mockResolvedValue(null);
    await expect(s.service.purchase(7, 10)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('regra não cumprida recusa com a primeira condição que falta', async () => {
    const s = setup(facts({ streak: 3 }));
    s.cosmetics.findOne.mockResolvedValue({
      ...baseItem,
      unlock_rule: streak5,
    });
    await expect(s.service.purchase(7, 10)).rejects.toThrow(
      new BadRequestException('Faltam 2 dias de sequência de acesso'),
    );
    expect(s.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('item antigo com conquista exigida bloqueada continua recusado', async () => {
    const s = setup(facts());
    s.cosmetics.findOne.mockResolvedValue({
      ...baseItem,
      required_achievement_slug: 'veterano',
    });
    await expect(s.service.purchase(7, 10)).rejects.toThrow(
      new BadRequestException('A conquista necessária ainda está bloqueada'),
    );
    expect(s.loader.load).toHaveBeenCalledWith(
      7,
      new Set(['achievement']),
      expect.anything(),
      { strict: true },
    );
    expect(s.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('com a regra cumprida abre a transação e devolve o Shop', async () => {
    const s = setup(facts({ streak: 5 }));
    s.cosmetics.findOne.mockResolvedValue({
      ...baseItem,
      unlock_rule: streak5,
    });
    s.dataSource.transaction.mockResolvedValue(undefined);
    await expect(s.service.purchase(7, 10)).resolves.toEqual({ shop: true });
    expect(s.dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});

describe('AchievementsService.purchaseKit', () => {
  const kit = {
    id: 3,
    slug: 'kit-natal',
    name: 'Kit de Natal',
    price: 6,
    active: true,
    unlock_rule: null,
    available_from: null,
    available_until: null,
    pieces: [{ id: 11, active: true }],
  };

  it('kit inexistente dá 404', async () => {
    const s = setup();
    s.kits.findOne.mockResolvedValue(null);
    await expect(s.service.purchaseKit(7, 3)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('kit fora do período não é mais vendido', async () => {
    const s = setup();
    s.kits.findOne.mockResolvedValue({
      ...kit,
      available_from: new Date(Date.now() + 60_000),
    });
    await expect(s.service.purchaseKit(7, 3)).rejects.toThrow(
      new BadRequestException('Este kit não está mais à venda'),
    );
  });

  it('regra do kit não cumprida recusa com a condição que falta', async () => {
    const s = setup(facts({ streak: 1 }));
    s.kits.findOne.mockResolvedValue({ ...kit, unlock_rule: streak5 });
    await expect(s.service.purchaseKit(7, 3)).rejects.toThrow(
      new BadRequestException('Faltam 4 dias de sequência de acesso'),
    );
    expect(s.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('kit sem peças ativas não é vendido', async () => {
    const s = setup();
    s.kits.findOne.mockResolvedValue({
      ...kit,
      pieces: [{ id: 11, active: false }],
    });
    await expect(s.service.purchaseKit(7, 3)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(s.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('kit liberado abre a transação e devolve o Shop', async () => {
    const s = setup();
    s.kits.findOne.mockResolvedValue(kit);
    s.dataSource.transaction.mockResolvedValue(undefined);
    await expect(s.service.purchaseKit(7, 3)).resolves.toEqual({ shop: true });
    expect(s.dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});

describe('AchievementsService.equip (cor)', () => {
  const owned = (
    item: Record<string, unknown>,
    color: string | null = null,
  ) => ({
    id: 1,
    usuario_id: 7,
    cosmetic_item_id: 10,
    equipped: false,
    color,
    cosmetic_item: {
      type: CosmeticType.HEAD,
      recolorable: false,
      visual_value: 'x',
      ...item,
    },
  });

  function equipSetup(record: ReturnType<typeof owned>) {
    const s = setup();
    s.userCosmetics.findOne.mockResolvedValue(record);
    s.userCosmetics.find.mockResolvedValue([record]);
    return { ...s, record };
  }

  it('cor em item não recolorível é descartada (grava null)', async () => {
    const s = equipSetup(owned({}));
    await s.service.equip(7, 10, '#2662E7');
    expect(s.record.equipped).toBe(true);
    expect(s.record.color).toBeNull();
    expect(s.userCosmetics.save).toHaveBeenCalledTimes(1);
  });

  it('item recolorável guarda a cor escolhida', async () => {
    const s = equipSetup(owned({ recolorable: true }));
    await s.service.equip(7, 10, '#2662E7');
    expect(s.record.color).toBe('#2662E7');
  });

  it('fundo personalizado (custom) guarda a cor mesmo sem ser recolorável', async () => {
    const s = equipSetup(
      owned({ type: CosmeticType.BACKGROUND, visual_value: 'custom' }),
    );
    await s.service.equip(7, 10, '#112233');
    expect(s.record.color).toBe('#112233');
  });

  it('fundo que não é custom não guarda cor', async () => {
    const s = equipSetup(
      owned({ type: CosmeticType.BACKGROUND, visual_value: 'aurora' }),
    );
    await s.service.equip(7, 10, '#112233');
    expect(s.record.color).toBeNull();
  });

  it('sem cor no pedido mantém a cor já guardada', async () => {
    const s = equipSetup(owned({ recolorable: true }, '#445566'));
    await s.service.equip(7, 10);
    expect(s.record.color).toBe('#445566');
  });

  it('cor nula limpa a cor guardada', async () => {
    const s = equipSetup(owned({ recolorable: true }, '#445566'));
    await s.service.equip(7, 10, null);
    expect(s.record.color).toBeNull();
  });

  it.each(['2662E7', '#2662E', '#GGGGGG', 'azul', ''])(
    'cor fora do padrão #RRGGBB ("%s") dá 400 e não grava',
    async (color) => {
      const s = equipSetup(owned({ recolorable: true }));
      await expect(s.service.equip(7, 10, color)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(s.userCosmetics.save).not.toHaveBeenCalled();
    },
  );

  it('item não adquirido dá 404', async () => {
    const s = setup();
    s.userCosmetics.findOne.mockResolvedValue(null);
    await expect(s.service.equip(7, 10)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
