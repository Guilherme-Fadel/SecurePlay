import { ChallengeService } from './challenge.service';
import { mergeRecordedAnswers } from './challenge-result';

/** A1: o PATCH de progresso não pode servir de oráculo do gabarito. */
describe('Desafio diário — fim do oráculo (A1)', () => {
  const questions = [
    { id: 1, options: ['A', 'B'], correct_index: 0, explanation: '' },
    { id: 2, options: ['A', 'B'], correct_index: 1, explanation: '' },
  ];

  function build(existing: Record<string, unknown> | null) {
    const repository = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn((value: object) => ({ ...value })),
      save: jest.fn((value: object) => Promise.resolve(value)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const manager = {
      getRepository: (entity: { name: string }) =>
        entity.name === 'Question'
          ? { count: jest.fn().mockResolvedValue(questions.length) }
          : repository,
    };
    const completions = {
      replay: jest.fn().mockResolvedValue(null),
      updateProgress: jest.fn((_id: number, work: (m: unknown) => unknown) =>
        work(manager),
      ),
      complete: jest.fn(
        async (
          _id: number,
          _kind: string,
          _source: number,
          work: (m: unknown) => Promise<{ result: unknown }>,
        ) => (await work(manager)).result,
      ),
    };
    const service = new ChallengeService(
      {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 5, active: true, points: 100 }),
      } as never,
      {
        find: jest.fn().mockResolvedValue(questions),
        findOne: jest.fn(({ where }: { where: { id: number } }) =>
          Promise.resolve(questions.find((q) => q.id === where.id) ?? null),
        ),
      } as never,
      {} as never,
      {} as never,
      completions as never,
    );
    jest
      .spyOn(service, 'getDailyChallenge')
      .mockResolvedValue({ id: 5 } as never);
    return { service, repository };
  }

  it('saveProgress não informa se a alternativa está correta', async () => {
    const { service, repository } = build(null);
    const right = await service.saveProgress(5, 7, 1, 0);
    expect(right).not.toHaveProperty('correct');
    expect(right).toMatchObject({ answeredCount: 1, progress: 50 });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ selected_answers: { '1': 0 } }),
    );
  });

  it('progresso conta respostas erradas também (respondidas / total)', async () => {
    const { service } = build(null);
    await expect(service.saveProgress(5, 7, 2, 0)).resolves.toMatchObject({
      answeredCount: 1,
      progress: 50,
    });
  });

  it('repetir a questão não troca a primeira resposta', async () => {
    const { service, repository } = build({
      id: 9,
      completed: false,
      answered_question_ids: [1],
      selected_answers: { '1': 1 },
    });
    await service.saveProgress(5, 7, 1, 0);
    expect(repository.update).toHaveBeenCalledWith(
      { id: 9, completed: false },
      expect.objectContaining({ selected_answers: { '1': 1 } }),
    );
  });

  it('a primeira resposta registrada prevalece no submit', async () => {
    const { service } = build({
      id: 9,
      completed: false,
      selected_answers: { '1': 1 },
    });
    const result = (await service.submitChallenge(5, 7, {
      answers: [
        { questionId: 1, selectedIndex: 0 },
        { questionId: 2, selectedIndex: 1 },
      ],
    })) as { correctCount: number; score: number };
    expect(result).toMatchObject({ correctCount: 1, score: 50 });
  });

  it('o corpo só completa questões sem registro', () => {
    expect(
      mergeRecordedAnswers(
        [
          { questionId: 1, selectedIndex: 0 },
          { questionId: 2, selectedIndex: 1 },
        ],
        { '1': 1 },
      ),
    ).toEqual([
      { questionId: 1, selectedIndex: 1 },
      { questionId: 2, selectedIndex: 1 },
    ]);
  });

  it('tentativa aberta antes do deploy usa o corpo', async () => {
    const { service } = build({
      id: 9,
      completed: false,
      answered_question_ids: [1],
      selected_answers: null,
    });
    const result = (await service.submitChallenge(5, 7, {
      answers: [
        { questionId: 1, selectedIndex: 0 },
        { questionId: 2, selectedIndex: 1 },
      ],
    })) as { correctCount: number };
    expect(result.correctCount).toBe(2);
  });
});
