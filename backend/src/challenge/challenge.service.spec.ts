import { BadRequestException } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

describe('ChallengeService daily authorization', () => {
  const buildService = () =>
    new ChallengeService(
      {
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(),
        count: jest.fn(),
      } as never,
      { findOne: jest.fn(), find: jest.fn(), count: jest.fn() } as never,
      {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      } as never,
      { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { get: jest.fn(), set: jest.fn() } as never,
      { emitAsync: jest.fn() } as never,
    );

  it('does not expose an S3 reference after retrieving a cached daily challenge', async () => {
    const service = buildService();
    const internals = service as any;
    internals.redisService.get.mockResolvedValue(
      JSON.stringify({ id: 5, image: '/old.svg' }),
    );
    internals.challengeRepository.findOne.mockResolvedValue({
      id: 5,
      image: 's3://test/new.png',
    });
    expect(await service.getDailyChallenge(11)).toEqual({ id: 5, image: null });
    expect(internals.redisService.set).not.toHaveBeenCalled();
  });

  it('recusa questions, progress e submit para um desafio diferente do diário', async () => {
    const service = buildService();
    jest
      .spyOn(service, 'getDailyChallenge')
      .mockResolvedValue({ id: 5 } as never);

    await expect(service.getQuestions(6, 11)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.saveProgress(6, 11, 101, 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.submitChallenge(6, 11, { answers: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('não reabre uma missão concluída por um PATCH parcial atrasado', async () => {
    const service = buildService();
    const internals = service as any;
    jest.spyOn(service, 'getDailyChallenge').mockResolvedValue({ id: 5 } as never);
    internals.questionRepository.findOne.mockResolvedValue({ id: 101, correct_index: 0 });
    internals.questionRepository.count.mockResolvedValue(1);
    // O PATCH leu o registro antes de outra requisição concluir a missão.
    internals.usuarioChallengeRepository.findOne.mockResolvedValue({
      id: 77,
      usuario_id: 11,
      challenge_id: 5,
      completed: false,
      answered_question_ids: [],
    });
    internals.usuarioChallengeRepository.update.mockResolvedValue({ affected: 0 });

    await expect(service.saveProgress(5, 11, 101, 0)).rejects.toThrow(
      'Desafio já concluído',
    );
    expect(internals.usuarioChallengeRepository.update).toHaveBeenCalledWith(
      { id: 77, completed: false },
      { answered_question_ids: [101], progress: 100 },
    );
    expect(internals.usuarioChallengeRepository.save).not.toHaveBeenCalled();
  });

  it('mantém o progresso parcial quando a missão ainda está aberta', async () => {
    const service = buildService();
    const internals = service as any;
    jest.spyOn(service, 'getDailyChallenge').mockResolvedValue({ id: 5 } as never);
    internals.questionRepository.findOne.mockResolvedValue({ id: 101, correct_index: 0 });
    internals.questionRepository.count.mockResolvedValue(2);
    internals.usuarioChallengeRepository.findOne.mockResolvedValue({
      id: 77,
      completed: false,
      answered_question_ids: [],
    });
    internals.usuarioChallengeRepository.update.mockResolvedValue({ affected: 1 });

    await expect(service.saveProgress(5, 11, 101, 0)).resolves.toMatchObject({
      correct: true,
      answeredCount: 1,
      totalQuestions: 2,
      progress: 50,
      completed: false,
    });
    expect(internals.usuarioChallengeRepository.update).toHaveBeenCalledWith(
      { id: 77, completed: false },
      { answered_question_ids: [101], progress: 50 },
    );
  });
});
