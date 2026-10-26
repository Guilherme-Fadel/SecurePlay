import { TokenService, TOKEN_REGEN_MS } from './token.service';

describe('TokenService — contrato de saldo e recibo', () => {
  const at = 1_000_000_000_000;
  it('retorna relógio de regeneração consistente com o estado recebido', async () => {
    const service = new TokenService({
      eval: jest.fn().mockResolvedValue([1, 2, at, at + 1000]),
    } as never);
    const state = await service.getState(7);
    expect(state).toMatchObject({
      balance: 2,
      nextRegenAt: at + TOKEN_REGEN_MS,
      nextRegenInSeconds: 1799,
    });
  });
  it('saldo cheio não apresenta contagem de regeneração', async () => {
    const service = new TokenService({
      eval: jest.fn().mockResolvedValue([1, 5, at, at]),
    } as never);
    expect(await service.getState(7)).toEqual({
      balance: 5,
      cap: 5,
      nextRegenAt: null,
      nextRegenInSeconds: 0,
    });
  });
  it('recibo repetido preserva o estado da cobrança original, sem recalcular pelo relógio atual', async () => {
    const service = new TokenService({
      eval: jest.fn().mockResolvedValue([1, 4, at, at]),
    } as never);
    const result = await service.consumeForRun(7, 'fixture-run', new Date(0));
    expect(result.ok).toBe(true);
    expect(result.state.nextRegenInSeconds).toBe(1800);
    expect(result.state.balance).toBe(4);
  });
  it('distingue primeira cobrança expirada de saldo insuficiente', async () => {
    const evalMock = jest
      .fn()
      .mockResolvedValueOnce([-1, 5, at, at])
      .mockResolvedValueOnce([0, 0, at, at]);
    const service = new TokenService({ eval: evalMock } as never);
    expect(await service.consumeForRun(7, 'run', new Date(0))).toMatchObject({
      ok: false,
      expired: true,
    });
    expect(await service.consumeForRun(7, 'run', new Date(0))).toMatchObject({
      ok: false,
      expired: false,
    });
  });
});
