import { BadRequestException } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

describe('ChallengeService daily authorization', () => {
  const buildService = () =>
    new ChallengeService(
      { findOne: jest.fn(), createQueryBuilder: jest.fn(), count: jest.fn() } as never,
      { findOne: jest.fn(), find: jest.fn(), count: jest.fn() } as never,
      { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), count: jest.fn() } as never,
      { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } as never,
      { get: jest.fn(), set: jest.fn() } as never,
      { emitAsync: jest.fn() } as never,
    );

  it('recusa questions, progress e submit para um desafio diferente do diário', async () => {
    const service = buildService();
    jest.spyOn(service, 'getDailyChallenge').mockResolvedValue({ id: 5 } as never);

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
});
