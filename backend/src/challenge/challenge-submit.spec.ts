import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChallengeService } from './challenge.service';
import { SubmitChallengeDto } from './dto/challenge.dto';

describe('Missão diária — validação antes da recompensa', () => {
  const build = () => {
    const completion = {
      replay: jest.fn().mockResolvedValue(null),
      complete: jest.fn(),
    };
    const service = new ChallengeService(
      {
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 5, active: true, points: 100 }),
      } as never,
      {
        find: jest.fn().mockResolvedValue([
          { id: 1, options: ['A', 'B'], correct_index: 0 },
          { id: 2, options: ['A', 'B'], correct_index: 1 },
        ]),
      } as never,
      {} as never,
      {} as never,
      completion as never,
    );
    const daily = jest
      .spyOn(service, 'getDailyChallenge')
      .mockResolvedValue({ id: 5 } as never);
    return { service, completion, daily };
  };

  it.each([
    [
      [1, 0],
      [1, 0],
    ],
    [[1, 0]],
    [
      [1, 0],
      [9, 0],
    ],
    [
      [1, 0],
      [2, -1],
    ],
    [
      [1, 0],
      [2, 2],
    ],
    [
      [1, 0],
      [2, 0.5],
    ],
  ])(
    'recusa duplicatas, questões ausentes/estranhas e opções inválidas: %j',
    async (...pairs) => {
      const { service, completion } = build();
      const answers = pairs.map(([questionId, selectedIndex]) => ({
        questionId,
        selectedIndex,
      }));
      await expect(service.submitChallenge(5, 7, { answers })).rejects.toThrow(
        /cada pergunta uma vez/,
      );
      expect(completion.complete).not.toHaveBeenCalled();
    },
  );

  it('recupera o resultado original sem depender do cache diário nem das respostas reenviadas', async () => {
    const { service, completion, daily } = build();
    const original = { score: 50, pointsEarned: 50, completed: true };
    completion.replay.mockResolvedValue(original);
    await expect(
      service.submitChallenge(5, 7, { answers: [] }),
    ).resolves.toEqual(original);
    expect(daily).not.toHaveBeenCalled();
    expect(completion.complete).not.toHaveBeenCalled();
  });

  it('rejeita duplicatas também na fronteira DTO', async () => {
    const value = plainToInstance(SubmitChallengeDto, {
      answers: [
        { questionId: 1, selectedIndex: 0 },
        { questionId: 1, selectedIndex: 0 },
      ],
    });
    expect(await validate(value)).not.toHaveLength(0);
  });
});
