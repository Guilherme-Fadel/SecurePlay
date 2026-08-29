import { TokenService, TOKEN_CAP, TOKEN_REGEN_MS } from './token.service';
class TestTokenService extends TokenService {
  public current = 1000000000000;
  protected now(): number {
    return this.current;
  }
}
describe('TokenService', () => {
  let service: TestTokenService;
  let store: Map<string, string>;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
  };
  beforeEach(() => {
    store = new Map();
    redis = {
      get: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      set: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      }),
    };
    service = new TestTokenService(redis as any);
  });
  it('novo usuario comeca com o teto de tokens', async () => {
    const state = await service.getState(1);
    expect(state.balance).toBe(TOKEN_CAP);
    expect(state.nextRegenInSeconds).toBe(0);
  });
  it('nao regenera antes de 30 min', async () => {
    store.set(
      'op-tokens:1',
      JSON.stringify({ balance: 2, lastRegenAt: service.current }),
    );
    service.current += TOKEN_REGEN_MS - 1000;
    const state = await service.getState(1);
    expect(state.balance).toBe(2);
  });
  it('regenera 1 token apos 1 intervalo', async () => {
    store.set(
      'op-tokens:1',
      JSON.stringify({ balance: 2, lastRegenAt: service.current }),
    );
    service.current += TOKEN_REGEN_MS;
    const state = await service.getState(1);
    expect(state.balance).toBe(3);
  });
  it('regenera N tokens apos N intervalos', async () => {
    store.set(
      'op-tokens:1',
      JSON.stringify({ balance: 1, lastRegenAt: service.current }),
    );
    service.current += TOKEN_REGEN_MS * 3;
    const state = await service.getState(1);
    expect(state.balance).toBe(4);
  });
  it('nao ultrapassa o teto mesmo com muito tempo decorrido', async () => {
    store.set(
      'op-tokens:1',
      JSON.stringify({ balance: 1, lastRegenAt: service.current }),
    );
    service.current += TOKEN_REGEN_MS * 100;
    const state = await service.getState(1);
    expect(state.balance).toBe(TOKEN_CAP);
    expect(state.nextRegenInSeconds).toBe(0);
  });
  it('saldo no teto nao adianta o relogio de regen', async () => {
    store.set(
      'op-tokens:1',
      JSON.stringify({
        balance: TOKEN_CAP,
        lastRegenAt: service.current - TOKEN_REGEN_MS * 5,
      }),
    );
    const state = await service.getState(1);
    expect(state.balance).toBe(TOKEN_CAP);
    const persisted = JSON.parse(store.get('op-tokens:1')!);
    expect(persisted.lastRegenAt).toBe(service.current);
  });
  it('refillToCap recarrega ate o teto', async () => {
    store.set(
      'op-tokens:1',
      JSON.stringify({ balance: 0, lastRegenAt: service.current }),
    );
    const state = await service.refillToCap(1);
    expect(state.balance).toBe(TOKEN_CAP);
  });
});
