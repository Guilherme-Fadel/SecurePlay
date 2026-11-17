import { ArcadeRunStore } from './arcade-run.store';
import { ArcadeGameType } from './entities/arcade-game.entity';
import type { ArcadeGame } from './entities/arcade-game.entity';

describe('ArcadeRunStore.openOrCreate — sorteio fora da trava', () => {
  const game = {
    slug: 'quiz-relampago',
    game_type: ArcadeGameType.QUIZ,
    xp_base: 100,
  } as ArcadeGame;
  const sorteada = {
    payload: { questions: [1] },
    answerKey: { correct: {}, order: [] },
  };

  const setup = (open: unknown) => {
    const ordem: string[] = [];
    const save = jest.fn(() => {
      ordem.push('save');
      return Promise.resolve();
    });
    const builder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(open),
    };
    const manager = {
      getRepository: () => ({ createQueryBuilder: () => builder, save }),
    };
    const completions = {
      updateProgress: jest.fn(
        async (_user: number, action: (m: unknown) => Promise<unknown>) => {
          ordem.push('trava:abre');
          try {
            return await action(manager);
          } finally {
            ordem.push('trava:fecha');
          }
        },
      ),
    };
    const build = jest.fn(() => {
      ordem.push('build');
      return Promise.resolve(sorteada);
    });
    const store = new ArcadeRunStore(
      {} as never,
      {} as never,
      completions as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { store, build, save, ordem };
  };

  it('chama build antes de abrir a trava e grava a rodada sorteada', async () => {
    const { store, build, save, ordem } = setup(null);
    const run = await store.openOrCreate(7, game, build);
    expect(ordem).toEqual(['build', 'trava:abre', 'save', 'trava:fecha']);
    expect(save).toHaveBeenCalledTimes(1);
    expect(run.payload).toBe(sorteada.payload);
    expect(run.answerKey).toBe(sorteada.answerKey);
    expect(run.runId).toEqual(expect.any(String));
  });

  it('descarta a rodada sorteada quando já existe partida aberta', async () => {
    const aberta = { run_id: 'aberta-1', payload: { questions: [9] } };
    const { store, build, save, ordem } = setup(aberta);
    const run = await store.openOrCreate(7, game, build);
    expect(ordem).toEqual(['build', 'trava:abre', 'trava:fecha']);
    expect(save).not.toHaveBeenCalled();
    expect(run).toEqual({ runId: 'aberta-1', payload: aberta.payload });
    expect(run.answerKey).toBeUndefined();
  });

  it('propaga a falha do sorteio sem abrir a trava', async () => {
    const { store, ordem } = setup(null);
    const erro = new Error('pool insuficiente');
    await expect(
      store.openOrCreate(7, game, () => Promise.reject(erro)),
    ).rejects.toBe(erro);
    expect(ordem).toEqual([]);
  });
});
