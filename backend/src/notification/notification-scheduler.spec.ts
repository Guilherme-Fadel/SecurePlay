import { NotificationScheduler } from './notification-scheduler';

const montar = (travar = true) => {
  const repositorio = { query: jest.fn() };
  const redis = { acquireLease: jest.fn().mockResolvedValue(travar) };
  const agendador = new NotificationScheduler(
    repositorio as never,
    redis as never,
    { jobs: [] } as never,
  );
  return { agendador, repositorio, redis };
};

describe('NotificationScheduler', () => {
  const ambiente = { ...process.env };
  afterEach(() => {
    process.env = { ...ambiente };
    jest.useRealTimers();
  });

  it('não inicia em NODE_ENV=test', () => {
    jest.useFakeTimers();
    const { agendador } = montar();
    process.env.NODE_ENV = 'test';
    agendador.onApplicationBootstrap();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('não inicia com NOTIFICATION_SCHEDULER_ENABLED=false', () => {
    jest.useFakeTimers();
    const { agendador } = montar();
    process.env.NODE_ENV = 'production';
    process.env.NOTIFICATION_SCHEDULER_ENABLED = 'false';
    agendador.onApplicationBootstrap();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('inicia habilitado e para no destroy', () => {
    jest.useFakeTimers();
    const { agendador } = montar();
    process.env.NODE_ENV = 'production';
    delete process.env.NOTIFICATION_SCHEDULER_ENABLED;
    agendador.onApplicationBootstrap();
    expect(jest.getTimerCount()).toBe(2);
    agendador.onModuleDestroy();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('sem a trava não executa jobs', async () => {
    const { agendador, redis } = montar(false);
    const executar = jest.fn();
    agendador.jobs.push({ nome: 'x', executar });

    expect(await agendador.rodar()).toBe(false);
    expect(redis.acquireLease).toHaveBeenCalledWith(
      'lock:notification-scheduler',
      expect.any(String),
      3300 * 1000,
    );
    expect(executar).not.toHaveBeenCalled();
  });

  it('com a trava executa todos os jobs, isolando falhas', async () => {
    const { agendador, repositorio } = montar();
    repositorio.query.mockResolvedValue({ affectedRows: 0 });
    const depois = jest.fn().mockResolvedValue(undefined);
    agendador.jobs.unshift({
      nome: 'quebra',
      executar: () => Promise.reject(new Error('falha')),
    });
    agendador.jobs.push({ nome: 'depois', executar: depois });

    expect(await agendador.rodar()).toBe(true);
    expect(depois).toHaveBeenCalled();
    expect(repositorio.query).toHaveBeenCalled();
  });

  it('retenção apaga em lotes de 1000, lidas (90d) e não lidas (180d)', async () => {
    const { agendador, repositorio } = montar();
    repositorio.query
      .mockResolvedValueOnce({ affectedRows: 1000 })
      .mockResolvedValueOnce({ affectedRows: 20 })
      .mockResolvedValueOnce({ affectedRows: 3 });
    const agora = new Date('2026-11-18T12:00:00Z');

    expect(await agendador.aplicarRetencao(agora)).toBe(1023);

    const chamadas = repositorio.query.mock.calls as unknown as [
      string,
      unknown[],
    ][];
    expect(chamadas).toHaveLength(3);
    expect(chamadas[0][1][0]).toBe(1);
    expect(chamadas[2][1][0]).toBe(0);
    const dias = (d: Date) =>
      Math.round((agora.getTime() - d.getTime()) / 86400000);
    expect(dias(chamadas[0][1][1] as Date)).toBe(90);
    expect(dias(chamadas[2][1][1] as Date)).toBe(180);
    expect(chamadas[0][1][2]).toBe(1000);
  });
});
