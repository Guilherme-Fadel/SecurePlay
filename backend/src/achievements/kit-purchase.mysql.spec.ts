import { arcadeFixture } from '../../test/fixtures/arcade-fixture';
import { CosmeticItem, CosmeticType } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { CosmeticRarity } from './entities/cosmetic-rarity';
import { PrestigeTransaction } from './entities/prestige-transaction.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';
import { executeKitPurchase } from './kit-purchase';
import { Usuario } from '../usuario/usuario.entity';

const isolated =
  process.env.RUN_ARCADE_INTEGRATION === '1' ? describe : describe.skip;

isolated('Compra de kit com carteira e peças transacionais', () => {
  let f: Awaited<ReturnType<typeof arcadeFixture>>;
  let user: Usuario;
  let kit: CosmeticKit;

  const buy = () =>
    f.source.transaction((manager) =>
      executeKitPurchase(manager, { usuario_id: user.id, kitId: kit.id }),
    );
  const wallet = () =>
    f.source
      .getRepository(PrestigeWallet)
      .findOneByOrFail({ usuario_id: user.id });
  const countOwned = () => ({
    pieces: f.source
      .getRepository(UsuarioCosmetic)
      .countBy({ usuario_id: user.id }),
    kits: f.source
      .getRepository(UsuarioCosmeticKit)
      .countBy({ usuario_id: user.id }),
    debits: f.source
      .getRepository(PrestigeTransaction)
      .countBy({ usuario_id: user.id, source_key: `kit:${kit.slug}` }),
  });
  const seedWallet = (balance: number) =>
    f.source
      .getRepository(PrestigeWallet)
      .save({ usuario_id: user.id, balance, total_earned: balance });

  beforeAll(async () => {
    f = await arcadeFixture();
  }, 60_000);
  beforeEach(async () => {
    user = await f.source
      .getRepository(Usuario)
      .save({ name: 'Kit Fixture', password: 'fixture-unused' });
    const saved = await f.source.getRepository(CosmeticKit).save({
      slug: `kit-fixture-${user.id}`,
      name: 'Kit Fixture',
      description: 'Fixture',
      rarity: CosmeticRarity.RARE,
      price: 6,
      active: true,
    });
    const types = [CosmeticType.HEAD, CosmeticType.FACE, CosmeticType.NECK];
    for (const [index, type] of types.entries()) {
      await f.source.getRepository(CosmeticItem).save({
        slug: `peca-fixture-${user.id}-${index}`,
        name: `Peça ${index}`,
        description: 'Fixture',
        rarity: CosmeticRarity.RARE,
        visual_value: `fixture-${index}`,
        type,
        price: 0,
        kit_id: saved.id,
      });
    }
    kit = await f.source
      .getRepository(CosmeticKit)
      .findOneOrFail({ where: { id: saved.id }, relations: { pieces: true } });
  });
  afterAll(async () => {
    f?.redis.onModuleDestroy();
    await f?.source.destroy();
  });

  it('kit de 3 peças debita uma vez, cria 3 peças desequipadas e 1 registro do kit', async () => {
    await seedWallet(10);
    await buy();

    expect(await wallet()).toMatchObject({ balance: 4, total_earned: 10 });
    const pieces = await f.source
      .getRepository(UsuarioCosmetic)
      .findBy({ usuario_id: user.id });
    expect(pieces).toHaveLength(3);
    for (const piece of pieces) {
      expect(piece.equipped).toBe(false);
      expect(piece.acquired_kit_id).toBe(kit.id);
    }
    expect(await countOwned().kits).toBe(1);
    expect(await countOwned().debits).toBe(1);
  });

  it('duas compras simultâneas debitam uma vez e rejeitam a outra', async () => {
    await seedWallet(20);
    const results = await Promise.allSettled([buy(), buy()]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0].reason)).toContain('Este kit já foi adquirido');
    expect(await wallet()).toMatchObject({ balance: 14 });
    expect(await countOwned().pieces).toBe(3);
    expect(await countOwned().kits).toBe(1);
    expect(await countOwned().debits).toBe(1);
  });

  it('saldo insuficiente não cria nada', async () => {
    await seedWallet(5);
    await expect(buy()).rejects.toThrow('Chaves Digitais insuficientes');

    expect(await wallet()).toMatchObject({ balance: 5 });
    expect(await countOwned().pieces).toBe(0);
    expect(await countOwned().kits).toBe(0);
    expect(await countOwned().debits).toBe(0);
  });
});
