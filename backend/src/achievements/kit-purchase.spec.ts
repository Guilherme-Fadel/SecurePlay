import { BadRequestException, NotFoundException } from '@nestjs/common';
import { executeKitPurchase } from './kit-purchase';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { PrestigeTransaction } from './entities/prestige-transaction.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { UsuarioCosmeticKit } from './entities/usuario-cosmetic-kit.entity';
import { Usuario } from '../usuario/usuario.entity';

const repository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn((value: unknown) => value),
  save: jest.fn((value: unknown) => Promise.resolve(value)),
});

const piece = (id: number, active = true) => ({ id, active });

const freshKit = (overrides: Record<string, unknown> = {}) => ({
  id: 3,
  slug: 'kit-natal',
  name: 'Kit de Natal',
  price: 6,
  active: true,
  available_from: null,
  available_until: null,
  pieces: [piece(11), piece(12), piece(13)],
  ...overrides,
});

function setup(options: {
  balance: number;
  alreadyOwned?: boolean;
  ownedPieceIds?: number[];
  kit?: Record<string, unknown> | null;
}) {
  const wallet = { usuario_id: 7, balance: options.balance, total_earned: 9 };
  const wallets = repository();
  wallets.findOneOrFail.mockResolvedValue(wallet);
  const ownedKits = repository();
  ownedKits.findOne.mockResolvedValue(
    options.alreadyOwned ? { id: 1, kit_id: 3 } : null,
  );
  const ownedItems = repository();
  ownedItems.find.mockResolvedValue(
    (options.ownedPieceIds ?? []).map((id) => ({ cosmetic_item_id: id })),
  );
  const transactions = repository();
  const kits = repository();
  kits.findOne.mockResolvedValue(
    options.kit === undefined ? freshKit() : options.kit,
  );
  const repositories = new Map<unknown, ReturnType<typeof repository>>([
    [Usuario, repository()],
    [PrestigeWallet, wallets],
    [UsuarioCosmeticKit, ownedKits],
    [UsuarioCosmetic, ownedItems],
    [PrestigeTransaction, transactions],
    [CosmeticKit, kits],
  ]);
  repositories.get(Usuario)?.findOneOrFail.mockResolvedValue({ id: 7 });
  const manager = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: (entity: unknown) => repositories.get(entity),
  };
  return {
    manager,
    wallet,
    wallets,
    ownedKits,
    ownedItems,
    transactions,
    kits,
  };
}

const buy = (s: ReturnType<typeof setup>) =>
  executeKitPurchase(s.manager as never, { usuario_id: 7, kitId: 3 });

describe('executeKitPurchase', () => {
  it('debita o preço uma vez, registra a transação e entrega as peças desequipadas', async () => {
    const s = setup({ balance: 10 });
    await buy(s);

    expect(s.wallet.balance).toBe(4);
    expect(s.wallets.save).toHaveBeenCalledTimes(1);
    expect(s.transactions.save).toHaveBeenCalledTimes(1);
    expect(s.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 7,
        amount: -6,
        source_key: 'kit:kit-natal',
        description: 'Kit adquirido no Shop: Kit de Natal',
      }),
    );
    expect(s.ownedKits.create).toHaveBeenCalledWith({
      usuario_id: 7,
      kit_id: 3,
    });
    expect(s.ownedItems.save).toHaveBeenCalledWith(
      [11, 12, 13].map((id) => ({
        usuario_id: 7,
        cosmetic_item_id: id,
        equipped: false,
        acquired_kit_id: 3,
      })),
    );
  });

  it('debita o preço relido dentro da transação, não um valor lido antes', async () => {
    const s = setup({ balance: 10, kit: freshKit({ price: 8 }) });
    await buy(s);

    expect(s.wallet.balance).toBe(2);
    expect(s.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: -8 }),
    );
  });

  it('com o preço relido acima do saldo, recusa sem criar nada', async () => {
    const s = setup({ balance: 7, kit: freshKit({ price: 8 }) });
    await expect(buy(s)).rejects.toThrow(
      new BadRequestException('Chaves Digitais insuficientes'),
    );
    expect(s.wallet.balance).toBe(7);
    expect(s.ownedKits.save).not.toHaveBeenCalled();
  });

  it('entrega só as peças que o aluno ainda não tem, cobrando o kit inteiro', async () => {
    const s = setup({ balance: 10, ownedPieceIds: [12] });
    await buy(s);

    expect(s.wallet.balance).toBe(4);
    expect(s.ownedKits.create).toHaveBeenCalledWith({
      usuario_id: 7,
      kit_id: 3,
    });
    expect(s.ownedItems.save).toHaveBeenCalledWith(
      [11, 13].map((id) => ({
        usuario_id: 7,
        cosmetic_item_id: id,
        equipped: false,
        acquired_kit_id: 3,
      })),
    );
  });

  it('com todas as peças já possuídas ainda registra o kit e cobra o preço', async () => {
    const s = setup({ balance: 10, ownedPieceIds: [11, 12, 13] });
    await buy(s);

    expect(s.wallet.balance).toBe(4);
    expect(s.ownedKits.save).toHaveBeenCalledTimes(1);
    expect(s.ownedItems.save).not.toHaveBeenCalled();
  });

  it('recusa kit já adquirido sem debitar nem criar nada', async () => {
    const s = setup({ balance: 10, alreadyOwned: true });
    await expect(buy(s)).rejects.toThrow(
      new BadRequestException('Este kit já foi adquirido'),
    );
    expect(s.wallet.balance).toBe(10);
    expect(s.wallets.save).not.toHaveBeenCalled();
    expect(s.ownedItems.save).not.toHaveBeenCalled();
  });

  it('recusa saldo insuficiente sem criar nada', async () => {
    const s = setup({ balance: 5 });
    await expect(buy(s)).rejects.toThrow(
      new BadRequestException('Chaves Digitais insuficientes'),
    );
    expect(s.wallet.balance).toBe(5);
    expect(s.transactions.save).not.toHaveBeenCalled();
    expect(s.ownedKits.save).not.toHaveBeenCalled();
    expect(s.ownedItems.save).not.toHaveBeenCalled();
  });

  it.each([
    [
      'kit desativado depois da leitura',
      freshKit({ active: false }),
      NotFoundException,
      'Kit não encontrado',
    ],
    ['kit que não existe mais', null, NotFoundException, 'Kit não encontrado'],
    [
      'kit fora do período na releitura',
      freshKit({ available_until: new Date(Date.now() - 60_000) }),
      BadRequestException,
      'Este kit não está mais à venda',
    ],
    [
      'kit sem peças ativas na releitura',
      freshKit({ pieces: [piece(11, false)] }),
      BadRequestException,
      'Este kit não tem peças disponíveis',
    ],
  ])('%s: recusa sem debitar', async (_name, kit, error, message) => {
    const s = setup({ balance: 10, kit });
    await expect(buy(s)).rejects.toThrow(new error(message));
    expect(s.wallet.balance).toBe(10);
    expect(s.wallets.save).not.toHaveBeenCalled();
    expect(s.ownedKits.save).not.toHaveBeenCalled();
  });
});
