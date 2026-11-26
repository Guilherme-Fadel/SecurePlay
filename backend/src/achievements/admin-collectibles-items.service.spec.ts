import { BadRequestException } from '@nestjs/common';
import {
  ACTOR,
  art,
  itemDto,
  kitDto,
  pngHeader,
  setup,
} from '../../test/fixtures/collectibles-fixture';
import { CosmeticRarity } from './entities/cosmetic-rarity';
import { CosmeticType } from './entities/cosmetic-item.entity';

describe('AdminCollectiblesService — itens avulsos', () => {
  it('cria item avulso e audita', async () => {
    const { service, db, audit } = setup();
    const view = await service.createItem(ACTOR, itemDto());
    expect(db.items[0]).toMatchObject({
      slug: 'moldura-azul',
      kit_id: null,
      active: false,
      visual_value: 'blue',
    });
    expect(view.kitId).toBeNull();
    expect(audit.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'collectible.created',
        alvoTipo: 'collectible_item',
      }),
      db.manager,
    );
  });

  it('recusa kitId na criação de item avulso', async () => {
    const { service } = setup();
    await expect(
      service.createItem(ACTOR, itemDto({ type: CosmeticType.HEAD, kitId: 3 })),
    ).rejects.toThrow(BadRequestException);
  });

  it('item de kit não é editado nem publicado pela rota de item', async () => {
    const { service } = setup();
    const kit = await service.createKit(ACTOR, kitDto());
    const pieceId = kit.pieces[0].id;
    await expect(service.updateItem(ACTOR, pieceId, itemDto())).rejects.toThrow(
      new BadRequestException('Peça de kit: edite pelo kit'),
    );
    await expect(service.publish(ACTOR, 'items', pieceId)).rejects.toThrow(
      new BadRequestException('Peça de kit: edite pelo kit'),
    );
  });

  it('recusa trocar o slug de item existente; o mesmo slug segue permitido', async () => {
    const { service, db } = setup();
    const item = await service.createItem(ACTOR, itemDto());
    await expect(
      service.updateItem(ACTOR, item.id, itemDto({ slug: 'outro-slug' })),
    ).rejects.toThrow(
      new BadRequestException(
        'O identificador não pode ser alterado depois de criado.',
      ),
    );
    expect(db.items[0].slug).toBe('moldura-azul');
    const same = await service.updateItem(
      ACTOR,
      item.id,
      itemDto({ name: 'Novo nome' }),
    );
    expect(same.slug).toBe('moldura-azul');
  });

  it('item de arte sem arte nem valor visual não publica; com arte publica', async () => {
    const { service } = setup();
    const empty = await service.createItem(
      ACTOR,
      itemDto({ type: CosmeticType.HEAD, visualValue: '' }),
    );
    await expect(service.publish(ACTOR, 'items', empty.id)).rejects.toThrow(
      BadRequestException,
    );
    const updated = await service.updateItem(
      ACTOR,
      empty.id,
      itemDto({ type: CosmeticType.HEAD, visualValue: '', artKey: art(5) }),
    );
    expect((await service.publish(ACTOR, 'items', updated.id)).active).toBe(
      true,
    );
  });

  it.each([CosmeticType.BACKGROUND, CosmeticType.CARD])(
    'cadastra %s com tema da biblioteca ou arte e recusa valor fora do padrão',
    async (type) => {
      const { service, db, s3 } = setup();
      if (type === CosmeticType.CARD) {
        s3.getObjectBuffer.mockResolvedValue(pngHeader(1600, 200));
      }
      const themed = await service.createItem(
        ACTOR,
        itemDto({ type, slug: `tema-${type}`, visualValue: 'por-do-sol' }),
      );
      expect(themed.visualValue).toBe('por-do-sol');
      const withArt = await service.createItem(
        ACTOR,
        itemDto({
          type,
          slug: `arte-${type}`,
          visualValue: '',
          artKey: art(7),
        }),
      );
      expect(withArt.artKey).toBe(art(7));
      await expect(
        service.createItem(
          ACTOR,
          itemDto({ type, slug: `ruim-${type}`, visualValue: 'Url("x")' }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(db.items).toHaveLength(2);
    },
  );

  it('item festivo sem período não publica', async () => {
    const { service } = setup();
    const item = await service.createItem(
      ACTOR,
      itemDto({ rarity: CosmeticRarity.FESTIVE }),
    );
    await expect(service.publish(ACTOR, 'items', item.id)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('arquivar item avulso desativa', async () => {
    const { service, db } = setup();
    const item = await service.createItem(ACTOR, itemDto());
    await service.publish(ACTOR, 'items', item.id);
    expect((await service.archive(ACTOR, 'items', item.id)).active).toBe(false);
    expect(db.items[0].active).toBe(false);
  });

  it('recusa arte que não existe no bucket', async () => {
    const { service, s3 } = setup();
    s3.headObject.mockResolvedValue(null);
    await expect(
      service.createItem(ACTOR, itemDto({ artKey: art(6) })),
    ).rejects.toThrow(BadRequestException);
  });

  it('exige a faixa no tema do card e a prancheta nas peças', async () => {
    const { service, s3 } = setup();
    const card = { type: CosmeticType.CARD, visualValue: '', artKey: art(6) };
    await expect(
      service.createItem(ACTOR, itemDto({ ...card, slug: 'card-prancheta' })),
    ).rejects.toThrow(/1600×200/);
    s3.getObjectBuffer.mockResolvedValue(pngHeader(1600, 200));
    await expect(
      service.createItem(
        ACTOR,
        itemDto({ type: CosmeticType.HEAD, visualValue: '', artKey: art(5) }),
      ),
    ).rejects.toThrow(/956×1080/);
    const ok = await service.createItem(
      ACTOR,
      itemDto({ ...card, slug: 'card-faixa' }),
    );
    expect(ok.artKey).toBe(art(6));
  });
});

describe('AdminCollectiblesService — listagem', () => {
  it('devolve o formato paginado do console', async () => {
    const { service } = setup();
    await service.createItem(ACTOR, itemDto());
    const page = await service.listItems({ page: 1, pageSize: 25 });
    expect(page).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    });
    expect(page.items[0]).toMatchObject({ slug: 'moldura-azul' });
  });

  it('filtra itens por encaixe e estado, e kits por estado', async () => {
    const { service } = setup();
    const frame = await service.createItem(ACTOR, itemDto());
    await service.createItem(
      ACTOR,
      itemDto({ slug: 'bone', type: CosmeticType.HEAD }),
    );
    await service.publish(ACTOR, 'items', frame.id);
    const kit = await service.createKit(ACTOR, kitDto());
    const all = await service.listItems({});
    const byType = await service.listItems({ type: CosmeticType.HEAD });
    const published = await service.listItems({ status: 'active' });
    const drafts = await service.listItems({ status: 'inactive' });
    expect(all.total).toBe(2);
    expect(byType.items.map((item) => item.slug)).toEqual(['bone']);
    expect(published.items.map((item) => item.slug)).toEqual(['moldura-azul']);
    expect(drafts.items.map((item) => item.slug)).toEqual(['bone']);
    expect((await service.listKits({})).total).toBe(1);
    expect((await service.listKits({ status: 'active' })).total).toBe(0);
    expect((await service.listKits({ status: 'inactive' })).items[0].id).toBe(
      kit.id,
    );
  });

  it('recusa encaixe e estado desconhecidos com 400', async () => {
    const { service } = setup();
    await expect(
      service.listItems({ type: 'hat' as CosmeticType }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.listItems({ status: 'archived' as 'active' }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.listKits({ status: '' as 'active' })).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('AdminCollectiblesService — PATCH em item publicado', () => {
  async function publishedItem() {
    const ctx = setup();
    const item = await ctx.service.createItem(ACTOR, itemDto());
    await ctx.service.publish(ACTOR, 'items', item.id);
    return { ...ctx, item };
  }

  it('virar festivo sem período recusa', async () => {
    const { service, item } = await publishedItem();
    await expect(
      service.updateItem(
        ACTOR,
        item.id,
        itemDto({ rarity: CosmeticRarity.FESTIVE }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('esvaziar o valor visual recusa', async () => {
    const { service, item } = await publishedItem();
    await expect(
      service.updateItem(ACTOR, item.id, itemDto({ visualValue: '' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('o tipo de um item existente não pode mudar', async () => {
    const { service, item } = await publishedItem();
    await expect(
      service.updateItem(
        ACTOR,
        item.id,
        itemDto({ type: CosmeticType.BACKGROUND }),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'O encaixe não pode ser alterado depois de criado',
      ),
    );
  });
});
