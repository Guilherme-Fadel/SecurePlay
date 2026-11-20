import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  ACTOR,
  art,
  kitDto,
  setup,
} from '../../test/fixtures/collectibles-fixture';
import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticRarity } from './entities/cosmetic-rarity';

describe('AdminCollectiblesService — kits', () => {
  it('recusa duas peças no mesmo encaixe', async () => {
    const { service, db } = setup();
    await expect(
      service.createKit(
        ACTOR,
        kitDto({
          pieces: [
            { type: 'head', name: 'A' },
            { type: 'head', name: 'B' },
          ],
        }),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(db.kits).toHaveLength(0);
  });

  it('cria o kit como rascunho com peças derivadas e audita', async () => {
    const { service, db, audit } = setup();
    const view = await service.createKit(ACTOR, kitDto());
    expect(db.kits).toHaveLength(1);
    expect(db.kits[0]).toMatchObject({ slug: 'kit-natal', active: false });
    expect(db.items.map((i) => i.slug)).toEqual([
      'kit-natal-head',
      'kit-natal-face',
    ]);
    expect(db.items[0]).toMatchObject({
      kit_id: db.kits[0].id,
      price: 0,
      rarity: CosmeticRarity.RARE,
      active: false,
      art_key: art(1),
      art_mime: 'image/png',
    });
    expect(view.pieces).toHaveLength(2);
    expect(view.pieces[0].artUrl).toBe(`https://signed/${art(1)}`);
    expect(audit.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'collectible.created',
        alvoTipo: 'collectible_kit',
        atorId: ACTOR,
      }),
      db.manager,
    );
  });

  it('recusa unlockRule inválida, inclusive lista vazia', async () => {
    const { service } = setup();
    await expect(
      service.createKit(
        ACTOR,
        kitDto({ unlockRule: { mode: 'all', conditions: [] } }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('data sem hora vale o dia inteiro em Brasília', async () => {
    const { service, db } = setup();
    await service.createKit(
      ACTOR,
      kitDto({
        rarity: CosmeticRarity.FESTIVE,
        festiveEvent: 'natal',
        availableFrom: '2026-12-20',
        availableUntil: '2026-12-31',
      }),
    );
    expect((db.kits[0].available_from as Date).toISOString()).toBe(
      '2026-12-20T03:00:00.000Z',
    );
    expect((db.kits[0].available_until as Date).toISOString()).toBe(
      '2027-01-01T02:59:59.999Z',
    );
  });

  it('data e hora ISO completas ficam como enviadas', async () => {
    const { service, db } = setup();
    await service.createKit(
      ACTOR,
      kitDto({ availableUntil: '2026-12-31T12:00:00.000Z' }),
    );
    expect((db.kits[0].available_until as Date).toISOString()).toBe(
      '2026-12-31T12:00:00.000Z',
    );
  });

  it('publicar exige a arte de cada peça e lista os encaixes', async () => {
    const { service } = setup();
    const kit = await service.createKit(
      ACTOR,
      kitDto({
        pieces: [
          { type: 'head', name: 'Gorro' },
          { type: 'skin', name: 'Pele', artKey: art(3) },
        ],
      }),
    );
    await expect(service.publish(ACTOR, 'kits', kit.id)).rejects.toThrow(
      new BadRequestException('Falta a arte de: Cabeça'),
    );
    const two = await service.createKit(
      ACTOR,
      kitDto({
        slug: 'kit-dois',
        pieces: [
          { type: 'head', name: 'Gorro' },
          { type: 'neck', name: 'Cachecol' },
        ],
      }),
    );
    await expect(service.publish(ACTOR, 'kits', two.id)).rejects.toThrow(
      new BadRequestException('Falta a arte de: Cabeça, Pescoço'),
    );
  });

  it('kit festivo sem período não publica; com período invertido também não', async () => {
    const { service } = setup();
    const kit = await service.createKit(
      ACTOR,
      kitDto({ rarity: CosmeticRarity.FESTIVE }),
    );
    await expect(service.publish(ACTOR, 'kits', kit.id)).rejects.toThrow(
      BadRequestException,
    );
    await service.updateKit(
      ACTOR,
      kit.id,
      kitDto({
        rarity: CosmeticRarity.FESTIVE,
        pieces: kit.pieces.map((p) => ({
          id: p.id,
          type: p.type as 'head',
          name: p.name,
          artKey: p.artKey,
        })),
        festiveEvent: 'natal',
        availableFrom: '2026-12-31',
        availableUntil: '2026-12-20',
      }),
    );
    await expect(service.publish(ACTOR, 'kits', kit.id)).rejects.toThrow(
      /depois do início/,
    );
  });

  it('kit raro sem período publica e ativa as peças; arquivar desativa tudo', async () => {
    const { service, db, audit } = setup();
    const kit = await service.createKit(ACTOR, kitDto());
    const published = await service.publish(ACTOR, 'kits', kit.id);
    expect(published.active).toBe(true);
    expect(db.items.every((i) => i.active === true)).toBe(true);
    expect(audit.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'collectible.published' }),
      db.manager,
    );
    const archived = await service.archive(ACTOR, 'kits', kit.id);
    expect(archived.active).toBe(false);
    expect(db.items.every((i) => i.active === false)).toBe(true);
    expect(audit.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'collectible.archived' }),
      db.manager,
    );
  });

  it('PATCH arquiva peça omitida, cria nova e atualiza existente', async () => {
    const { service, db, audit } = setup();
    const kit = await service.createKit(ACTOR, kitDto());
    const [head] = kit.pieces;
    const view = await service.updateKit(
      ACTOR,
      kit.id,
      kitDto({
        name: 'Kit de Natal 2',
        pieces: [
          { id: head.id, type: 'head', name: 'Gorro novo', artKey: art(1) },
          { type: 'neck', name: 'Cachecol', artKey: art(4) },
        ],
      }),
    );
    expect(db.kits[0].name).toBe('Kit de Natal 2');
    const byType = Object.fromEntries(
      db.items.map((i) => [i.type as string, i]),
    ) as Record<string, (typeof db.items)[number]>;
    expect(byType.head.name).toBe('Gorro novo');
    expect(byType.face.active).toBe(false);
    expect(byType.neck).toMatchObject({
      slug: 'kit-natal-neck',
      kit_id: kit.id,
    });
    expect(db.items).toHaveLength(3);
    expect(view.pieces.map((p) => p.type).sort()).toEqual(['head', 'neck']);
    expect(audit.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'collectible.updated' }),
      db.manager,
    );
  });

  it('recusa trocar o slug de kit existente; o mesmo slug segue permitido', async () => {
    const { service, db } = setup();
    const kit = await service.createKit(ACTOR, kitDto());
    const pieces = kit.pieces.map((p) => ({
      id: p.id,
      type: p.type as 'head' | 'face',
      name: p.name,
      artKey: p.artKey,
    }));
    await expect(
      service.updateKit(ACTOR, kit.id, kitDto({ slug: 'kit-novo', pieces })),
    ).rejects.toThrow(
      new BadRequestException(
        'O identificador não pode ser alterado depois de criado.',
      ),
    );
    expect(db.kits[0].slug).toBe('kit-natal');
    await expect(
      service.updateKit(ACTOR, kit.id, kitDto({ name: 'Outro', pieces })),
    ).resolves.toMatchObject({ slug: 'kit-natal' });
  });

  it('slug de peça tomado por outro salvamento simultâneo vira 409, não 500', async () => {
    const { service, db } = setup();
    jest
      .spyOn(db.manager.getRepository(CosmeticItem), 'save')
      .mockRejectedValueOnce(
        Object.assign(new Error('Duplicate entry'), {
          driverError: { code: 'ER_DUP_ENTRY' },
        }),
      );
    const failure: unknown = await service
      .createKit(ACTOR, kitDto())
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ConflictException);
    expect((failure as Error).message).toBe(
      'Outro cadastro usou o mesmo identificador. Tente salvar de novo.',
    );
    // Outro erro do banco segue como falha inesperada.
    jest
      .spyOn(db.manager.getRepository(CosmeticItem), 'save')
      .mockRejectedValueOnce(new Error('conexão perdida'));
    await expect(
      service.createKit(ACTOR, kitDto({ slug: 'kit-outro' })),
    ).rejects.toThrow('conexão perdida');
  });

  it('PATCH recusa peça de outro kit', async () => {
    const { service } = setup();
    const a = await service.createKit(ACTOR, kitDto());
    const b = await service.createKit(
      ACTOR,
      kitDto({ slug: 'kit-b', pieces: [{ type: 'skin', name: 'Pele' }] }),
    );
    await expect(
      service.updateKit(
        ACTOR,
        a.id,
        kitDto({
          pieces: [{ id: b.pieces[0].id, type: 'skin', name: 'Pele' }],
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('AdminCollectiblesService — PATCH em kit publicado', () => {
  async function publishedKit() {
    const ctx = setup();
    const kit = await ctx.service.createKit(ACTOR, kitDto());
    await ctx.service.publish(ACTOR, 'kits', kit.id);
    const pieces = kit.pieces.map((p) => ({
      id: p.id,
      type: p.type as 'head' | 'face',
      name: p.name,
      artKey: p.artKey,
    }));
    return { ...ctx, kit, pieces };
  }

  it('limpar a arte de uma peça recusa e lista o encaixe', async () => {
    const { service, kit, pieces } = await publishedKit();
    await expect(
      service.updateKit(
        ACTOR,
        kit.id,
        kitDto({
          pieces: [{ ...pieces[0], artKey: null }, pieces[1]],
        }),
      ),
    ).rejects.toThrow(new BadRequestException('Falta a arte de: Cabeça'));
  });

  it('peça nova sem arte em kit publicado recusa', async () => {
    const { service, kit, pieces } = await publishedKit();
    await expect(
      service.updateKit(
        ACTOR,
        kit.id,
        kitDto({ pieces: [...pieces, { type: 'neck', name: 'Cachecol' }] }),
      ),
    ).rejects.toThrow(new BadRequestException('Falta a arte de: Pescoço'));
  });

  it('virar festivo sem período recusa', async () => {
    const { service, kit, pieces } = await publishedKit();
    await expect(
      service.updateKit(
        ACTOR,
        kit.id,
        kitDto({ rarity: CosmeticRarity.FESTIVE, pieces }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('kit em rascunho aceita o mesmo PATCH (a regra vale só para publicado)', async () => {
    const { service } = setup();
    const kit = await service.createKit(ACTOR, kitDto());
    await expect(
      service.updateKit(
        ACTOR,
        kit.id,
        kitDto({ rarity: CosmeticRarity.FESTIVE }),
      ),
    ).resolves.toBeDefined();
  });

  it('o encaixe de uma peça existente não pode mudar', async () => {
    const { service, kit, pieces } = await publishedKit();
    await expect(
      service.updateKit(
        ACTOR,
        kit.id,
        kitDto({ pieces: [{ ...pieces[0], type: 'neck' }, pieces[1]] }),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'O encaixe não pode ser alterado depois de criado',
      ),
    );
  });
});
