import { AddNicknameOnboarding1793059200000 } from './1793059200000-add-nickname-onboarding';

describe('Migração aditiva de boas-vindas de apelido', () => {
  it('preserva contas existentes fora das boas-vindas e não altera apelidos', async () => {
    const runner = {
      hasColumn: jest.fn().mockResolvedValue(false),
      addColumn: jest.fn(),
    };
    await new AddNicknameOnboarding1793059200000().up(runner as never);
    expect(runner.addColumn).toHaveBeenCalledTimes(1);
    expect(runner.addColumn).toHaveBeenCalledWith(
      'usuario',
      expect.objectContaining({
        name: 'nickname_onboarding_pending',
        type: 'tinyint',
        default: 0,
        isNullable: false,
      }),
    );
  });
  it('pode ser executada novamente sem recriar a coluna', async () => {
    const runner = {
      hasColumn: jest.fn().mockResolvedValue(true),
      addColumn: jest.fn(),
      dropColumn: jest.fn(),
    };
    const migration = new AddNicknameOnboarding1793059200000();
    await migration.up(runner as never);
    expect(runner.addColumn).not.toHaveBeenCalled();
    await migration.down(runner as never);
    expect(runner.dropColumn).toHaveBeenCalledWith(
      'usuario',
      'nickname_onboarding_pending',
    );
  });
});
