import { AddPasswordSetupResendCooldown1790640000001 } from './1790640000001-add-password-setup-resend-cooldown';

describe('Migração de limite de reenvio de senha', () => {
  it('adiciona a coluna nullable e permite rollback sem alterar contas existentes', async () => {
    const hasColumn = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const addColumn = jest.fn().mockResolvedValue(undefined);
    const dropColumn = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { hasColumn, addColumn, dropColumn } as never;
    const migration = new AddPasswordSetupResendCooldown1790640000001();

    await migration.up(queryRunner);
    expect(addColumn).toHaveBeenCalledWith('usuario', expect.objectContaining({
      name: 'password_setup_last_sent_at',
      type: 'datetime',
      isNullable: true,
    }));
    await migration.down(queryRunner);
    expect(dropColumn).toHaveBeenCalledWith('usuario', 'password_setup_last_sent_at');
  });
});
