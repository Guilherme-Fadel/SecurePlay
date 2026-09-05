import { TermoDictionaryService } from './termotech-dictionary.service';

const response = (status: number, payload: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
  }) as unknown as Response;

describe('TermoDictionaryService', () => {
  const originalFetch = global.fetch;
  let service: TermoDictionaryService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new TermoDictionaryService();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('aceita uma palavra encontrada no dicionario ingles', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, [{ word: 'cyber' }]));

    await expect(service.validate('CYBER')).resolves.toEqual({
      valid: true,
      languages: ['en'],
      verified: true,
    });
  });

  it('aceita uma palavra encontrada no dicionario portugues', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, [{ word: 'cinco' }]))
      .mockResolvedValueOnce(response(404, {}));

    await expect(service.validate('cinco')).resolves.toEqual({
      valid: true,
      languages: ['pt'],
      verified: true,
    });
  });

  it('recusa uma sequencia ausente nos dois dicionarios', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, [{ word: 'zzzz' }]));

    await expect(service.validate('zzzzz')).resolves.toEqual({
      valid: false,
      languages: [],
      verified: true,
      reason: 'not_found',
    });
  });

  it('bloqueia termo improprio sem consultar provedores externos', async () => {
    const result = await service.validate('PORRA');

    expect(result).toEqual({
      valid: false,
      languages: [],
      verified: true,
      reason: 'blocked',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mantem o jogo disponivel quando um provedor falha', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(response(404, {}));

    await expect(service.validate('teste')).resolves.toEqual({
      valid: true,
      languages: [],
      verified: false,
    });
  });

  it('reutiliza o resultado em cache', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, []))
      .mockResolvedValueOnce(response(200, [{ word: 'prime' }]));

    await service.validate('prime');
    await service.validate('PRIME');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
