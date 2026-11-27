import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ACTOR,
  itemDto,
  setup,
} from '../../test/fixtures/collectibles-fixture';
import { AchievementsService } from './achievements.service';
import { CollectibleItemDto } from './dto/collectible-item.dto';
import { loadShopCatalog } from './cosmetic-shop.catalog';
import { buildEquippedList } from './cosmetic-shop.mapper';
import { executeCosmeticPurchase } from './cosmetic-purchase';
import { CosmeticItem, CosmeticType } from './entities/cosmetic-item.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import {
  ACTIVE_TYPES,
  isRetiredType,
  RETIRED_TYPE_MESSAGE,
  RETIRED_TYPES,
} from './retired-types';
import { Usuario } from '../usuario/usuario.entity';

const RETIRED = [CosmeticType.FRAME, CosmeticType.TITLE, CosmeticType.BADGE];
const LOOK_TYPES = [
  CosmeticType.SKIN,
  CosmeticType.HEAD,
  CosmeticType.FACE,
  CosmeticType.NECK,
  CosmeticType.EFFECT,
  CosmeticType.BACKGROUND,
  CosmeticType.CARD,
];

const item = (id: number, type: CosmeticType, extra = {}) =>
  ({
    id,
    slug: `i-${id}`,
    type,
    price: 1,
    active: true,
    kit_id: null,
    available_from: null,
    available_until: null,
    unlock_rule: null,
    ...extra,
  }) as never;

describe('tipos descontinuados (moldura, título, emblema)', () => {
  it('a constante cobre só os três legados e o enum não perdeu valores', () => {
    expect([...RETIRED_TYPES].sort()).toEqual([...RETIRED].sort());
    expect([...ACTIVE_TYPES].sort()).toEqual([...LOOK_TYPES].sort());
    expect(Object.values(CosmeticType)).toEqual(
      expect.arrayContaining(RETIRED),
    );
    expect(isRetiredType('frame')).toBe(true);
    expect(isRetiredType('head')).toBe(false);
  });

  describe('loja do aluno', () => {
    it('não lista itens retirados, nem os que o aluno já possuía', async () => {
      const all = [
        item(1, CosmeticType.HEAD),
        item(2, CosmeticType.FRAME),
        item(3, CosmeticType.TITLE),
        item(4, CosmeticType.BADGE),
      ];
      const repos = {
        items: { find: jest.fn().mockResolvedValue(all) },
        kits: { find: jest.fn().mockResolvedValue([]) },
      };
      const { items } = await loadShopCatalog(
        repos as never,
        [2, 3, 4],
        new Set(),
      );
      expect(items.map((entry) => entry.id)).toEqual([1]);
    });

    it('não devolve retirados em equipados', () => {
      const owned = [
        CosmeticType.HEAD,
        CosmeticType.FRAME,
        CosmeticType.BADGE,
      ].map((type, index) => ({
        equipped: true,
        color: null,
        cosmetic_item: item(index + 1, type),
      }));
      const equipped = buildEquippedList(owned as never, new Map());
      expect(equipped.map((entry) => entry.type)).toEqual([CosmeticType.HEAD]);
    });
  });

  describe('compra, equipar e desequipar', () => {
    function build() {
      const cosmetics = { findOne: jest.fn(), find: jest.fn() };
      const userCosmetics = {
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
      };
      const dataSource = { transaction: jest.fn(), getRepository: jest.fn() };
      const service = new AchievementsService(
        cosmetics as never,
        userCosmetics as never,
        dataSource as never,
        undefined,
        undefined,
        undefined,
      );
      jest.spyOn(service, 'getTrail').mockResolvedValue({} as never);
      jest.spyOn(service, 'getShop').mockResolvedValue({} as never);
      return { service, cosmetics, userCosmetics, dataSource };
    }

    it.each(RETIRED)(
      'comprar %s é recusado antes da transação',
      async (type) => {
        const s = build();
        s.cosmetics.findOne.mockResolvedValue(item(10, type));
        await expect(s.service.purchase(7, 10)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(s.dataSource.transaction).not.toHaveBeenCalled();
      },
    );

    it.each(RETIRED)('a compra relida na transação recusa %s', async (type) => {
      const wallet = { usuario_id: 7, balance: 10, total_earned: 10 };
      const save = jest.fn();
      const repo = (extra: object = {}) => ({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findOneOrFail: jest.fn().mockResolvedValue(wallet),
        save,
        ...extra,
      });
      const repositories = new Map<unknown, unknown>([
        [
          Usuario,
          repo({ findOneOrFail: jest.fn().mockResolvedValue({ id: 7 }) }),
        ],
        [PrestigeWallet, repo()],
        [
          CosmeticItem,
          repo({ findOne: jest.fn().mockResolvedValue(item(10, type)) }),
        ],
        [UsuarioCosmetic, repo()],
      ]);
      const manager = {
        query: jest.fn().mockResolvedValue([]),
        getRepository: (entity: unknown) => repositories.get(entity),
      };
      await expect(
        executeCosmeticPurchase(manager as never, {
          usuario_id: 7,
          itemId: 10,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(save).not.toHaveBeenCalled();
      expect(wallet.balance).toBe(10);
    });

    it.each(RETIRED)('equipar %s já possuído é recusado', async (type) => {
      const s = build();
      s.userCosmetics.findOne.mockResolvedValue({
        id: 1,
        cosmetic_item: item(10, type),
      });
      await expect(s.service.equip(7, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(s.userCosmetics.save).not.toHaveBeenCalled();
    });

    it.each(RETIRED)('desequipar o tipo %s é recusado', async (type) => {
      const s = build();
      await expect(s.service.unequip(7, type)).rejects.toThrow(
        new BadRequestException(RETIRED_TYPE_MESSAGE),
      );
      expect(s.userCosmetics.save).not.toHaveBeenCalled();
    });

    it('encaixe do personagem continua podendo ser desequipado', async () => {
      const s = build();
      s.userCosmetics.find.mockResolvedValue([
        { equipped: true, cosmetic_item: item(1, CosmeticType.HEAD) },
      ]);
      await s.service.unequip(7, CosmeticType.HEAD);
      expect(s.userCosmetics.save).toHaveBeenCalled();
    });
  });

  describe('console admin', () => {
    it.each(RETIRED)(
      'o DTO recusa criar item %s com mensagem em português',
      async (type) => {
        const dto = plainToInstance(CollectibleItemDto, itemDto({ type }));
        const errors = await validate(dto);
        expect(errors.map((e) => e.property)).toEqual(['type']);
        expect(Object.values(errors[0].constraints ?? {})).toContain(
          RETIRED_TYPE_MESSAGE,
        );
      },
    );

    it('o DTO aceita os encaixes do personagem', async () => {
      for (const type of LOOK_TYPES) {
        const dto = plainToInstance(CollectibleItemDto, itemDto({ type }));
        expect(await validate(dto)).toEqual([]);
      }
    });

    it.each(RETIRED)(
      'o serviço não cria nem atualiza item %s',
      async (type) => {
        const { service, db } = setup();
        await expect(
          service.createItem(ACTOR, itemDto({ type })),
        ).rejects.toThrow(new BadRequestException(RETIRED_TYPE_MESSAGE));
        expect(db.items).toHaveLength(0);
        // Item legado já no banco: não muda nem volta à venda.
        db.items.push({
          id: 1,
          slug: 'moldura-azul',
          type,
          active: false,
          kit_id: null,
          visual_value: 'x',
        });
        await expect(
          service.updateItem(ACTOR, 1, itemDto({ type })),
        ).rejects.toThrow(RETIRED_TYPE_MESSAGE);
        await expect(service.publish(ACTOR, 'items', 1)).rejects.toThrow(
          RETIRED_TYPE_MESSAGE,
        );
      },
    );

    it('a listagem do admin ainda mostra e arquiva item legado', async () => {
      const { service, db } = setup();
      db.items.push({
        id: 1,
        slug: 'moldura-antiga',
        name: 'Moldura antiga',
        description: 'd',
        type: CosmeticType.FRAME,
        rarity: 'common',
        price: 1,
        visual_value: 'x',
        active: true,
        kit_id: null,
        festive_event: null,
        available_from: null,
        available_until: null,
        unlock_rule: null,
        art_key: null,
      });
      const page = await service.listItems({});
      expect(page.items.map((entry) => entry.slug)).toEqual(['moldura-antiga']);
      await service.archive(ACTOR, 'items', 1);
      expect(db.items[0].active).toBe(false);
    });
  });
});
