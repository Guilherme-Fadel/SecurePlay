import { TrialAccessGuard } from './trial-access.guard';

describe('Fim do teste gratuito', () => {
  it('bloqueia uma chamada autenticada após o prazo mesmo com JWT válido', async () => {
    const guard = new TrialAccessGuard(
      { getAllAndOverride: jest.fn().mockReturnValue(false) } as never,
      {
        getRepository: () => ({
          findOne: jest
            .fn()
            .mockResolvedValue({ trial_ends_at: new Date(Date.now() - 1000) }),
        }),
      } as never,
    );
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { userId: 7 } }) }),
    };
    await expect(guard.canActivate(context as never)).rejects.toThrow(
      'Seu teste gratuito terminou',
    );
  });
});
