import { BadRequestException, NotFoundException } from '@nestjs/common';
import { executeCosmeticPurchase } from './cosmetic-purchase';
import { CosmeticItem, CosmeticType } from './entities/cosmetic-item.entity';
import { PrestigeTransaction } from './entities/prestige-transaction.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import { UsuarioCosmetic } from './entities/usuario-cosmetic.entity';
import { Usuario } from '../usuario/usuario.entity';

const repository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn((value: unknown) => value),
  save: jest.fn((value: unknown) => Promise.resolve(value)),
});

const freshItem = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  slug: 'moldura-violeta',
  name: 'Moldura Violeta',
  type: CosmeticType.HEAD,
  price: 2,
  active: true,
  kit_id: null,
  available_from: null,
  available_until: null,
  ...overrides,
});

function setup(options: {
  balance: number;
  item?: Record<string, unknown> | null;
}) {
  const wallet = { usuario_id: 7, balance: options.balance, total_earned: 9 };
  const wallets = repository();
  wallets.findOneOrFail.mockResolvedValue(wallet);
  const items = repository();
  items.findOne.mockResolvedValue(
    options.item === undefined ? freshItem() : options.item,
  );
  const owned = repository();
  owned.findOne.mockResolvedValue(null);
  const transactions = repository();
  const users = repository();
  users.findOneOrFail.mockResolvedValue({ id: 7 });
  const repositories = new Map<unknown, ReturnType<typeof repository>>([
    [Usuario, users],
    [PrestigeWallet, wallets],
    [CosmeticItem, items],
    [UsuarioCosmetic, owned],
    [PrestigeTransaction, transactions],
  ]);
  const manager = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: (entity: unknown) => repositories.get(entity),
  };
  return { manager, wallet, wallets, transactions, owned };
}

const buy = (s: ReturnType<typeof setup>) =>
  executeCosmeticPurchase(s.manager as never, { usuario_id: 7, itemId: 10 });

describe('executeCosmeticPurchase', () => {
  it('debita o preço relido dentro da transação, não um valor lido antes', async () => {
    const s = setup({ balance: 10, item: freshItem({ price: 5 }) });
    await buy(s);

    expect(s.wallet.balance).toBe(5);
    expect(s.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: -5,
        source_key: 'purchase:moldura-violeta',
      }),
    );
    expect(s.owned.create).toHaveBeenCalledWith({
      usuario_id: 7,
      cosmetic_item_id: 10,
      equipped: true,
    });
  });

  it('recusa item desativado depois da leitura inicial', async () => {
    const s = setup({ balance: 10, item: freshItem({ active: false }) });
    await expect(buy(s)).rejects.toBeInstanceOf(NotFoundException);
    expect(s.wallets.save).not.toHaveBeenCalled();
  });

  it('recusa item que saiu da janela de venda', async () => {
    const s = setup({
      balance: 10,
      item: freshItem({ available_until: new Date('2020-01-01') }),
    });
    await expect(buy(s)).rejects.toThrow('Este item não está mais à venda');
    expect(s.wallets.save).not.toHaveBeenCalled();
  });

  it('recusa item que passou a ser peça de kit', async () => {
    const s = setup({ balance: 10, item: freshItem({ kit_id: 3 }) });
    await expect(buy(s)).rejects.toBeInstanceOf(BadRequestException);
    await expect(buy(s)).rejects.toThrow('Esta peça só vem com o kit');
    expect(s.wallets.save).not.toHaveBeenCalled();
  });

  it('recusa quando o preço relido passa do saldo', async () => {
    const s = setup({ balance: 3, item: freshItem({ price: 5 }) });
    await expect(buy(s)).rejects.toThrow('Chaves Digitais insuficientes');
    expect(s.wallet.balance).toBe(3);
  });
});
