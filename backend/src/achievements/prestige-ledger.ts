import { DataSource, EntityManager } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import { PrestigeTransaction } from './entities/prestige-transaction.entity';

/** Ordem comum a grants, compras e conciliação: usuário -> carteira. */
export async function lockPrestigeWallet(
  manager: EntityManager,
  usuarioId: number,
) {
  await manager.getRepository(Usuario).findOneOrFail({
    where: { id: usuarioId },
    lock: { mode: 'pessimistic_write' },
  });
  const repository = manager.getRepository(PrestigeWallet);
  // Upsert antes do locking read evita gap locks concorrentes em carteiras novas.
  await manager.query(
    'INSERT INTO prestige_wallet (usuario_id, balance, total_earned) VALUES (?, 0, 0) ON DUPLICATE KEY UPDATE usuario_id = VALUES(usuario_id)',
    [usuarioId],
  );
  return repository.findOneOrFail({
    where: { usuario_id: usuarioId },
    lock: { mode: 'pessimistic_write' },
  });
}

export interface PrestigeSnapshot {
  balance: number;
  totalEarned: number;
  ledgerBalance: number;
  ledgerEarned: number;
  ledgerCount: number;
}

/** Diagnóstico não modifica dados; o chamador escolhe o ambiente. */
export async function inspectPrestigeWallet(
  manager: EntityManager,
  usuarioId: number,
): Promise<PrestigeSnapshot> {
  const wallet = await manager
    .getRepository(PrestigeWallet)
    .findOneBy({ usuario_id: usuarioId });
  const entries = await manager
    .getRepository(PrestigeTransaction)
    .find({ where: { usuario_id: usuarioId } });
  return {
    balance: wallet?.balance ?? 0,
    totalEarned: wallet?.total_earned ?? 0,
    ledgerBalance: entries.reduce((sum, entry) => sum + entry.amount, 0),
    ledgerEarned: entries.reduce(
      (sum, entry) => sum + Math.max(0, entry.amount),
      0,
    ),
    ledgerCount: entries.length,
  };
}

/**
 * Reparo explícito, nunca chamado pelo tráfego normal. Exige saldo/ledger
 * conferidos pelo operador; nenhuma inferência pode apagar saldo legado.
 */
export async function reconcilePrestigeWallet(
  source: DataSource,
  usuarioId: number,
  expected: PrestigeSnapshot,
): Promise<PrestigeSnapshot> {
  return source.transaction(async (manager) => {
    const wallet = await lockPrestigeWallet(manager, usuarioId);
    const actual = await inspectPrestigeWallet(manager, usuarioId);
    for (const key of Object.keys(actual) as Array<keyof PrestigeSnapshot>) {
      if (actual[key] !== expected[key])
        throw new Error('Conciliação cancelada: snapshot mudou');
    }
    if (
      actual.ledgerCount === 0 ||
      !Number.isSafeInteger(actual.ledgerBalance) ||
      !Number.isSafeInteger(actual.ledgerEarned) ||
      actual.ledgerBalance < 0 ||
      actual.ledgerEarned < 0 ||
      actual.ledgerEarned > 2_147_483_647 ||
      actual.ledgerBalance > 2_147_483_647
    )
      throw new Error(
        'Conciliação exige ledger válido e evidência dos lançamentos',
      );
    wallet.balance = actual.ledgerBalance;
    wallet.total_earned = actual.ledgerEarned;
    await manager.getRepository(PrestigeWallet).save(wallet);
    return {
      ...actual,
      balance: wallet.balance,
      totalEarned: wallet.total_earned,
    };
  });
}
