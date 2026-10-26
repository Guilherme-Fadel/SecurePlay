import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ArcadeService } from './arcade.service';
import { ArcadeGameType } from './entities/arcade-game.entity';
import { resolveCompanyParameters } from '../config/features';

describe('ArcadeService — catálogo e início durável', () => {
  const setup = () => {
    const game = {
      slug: 'quiz-relampago',
      title: 'Quiz Fixture',
      game_type: ArcadeGameType.QUIZ,
      xp_base: 100,
      active: true,
    };
    const games = {
      findOne: jest.fn().mockResolvedValue(game),
      find: jest.fn().mockResolvedValue([game]),
    };
    const redis = { set: jest.fn().mockResolvedValue(undefined) };
    const tokens = {
      getState: jest.fn().mockResolvedValue({
        balance: 5,
        cap: 5,
        nextRegenAt: null,
        nextRegenInSeconds: 0,
      }),
    };
    const handler = {
      buildRun: jest.fn().mockResolvedValue({
        payload: { questions: [] },
        answerKey: { correct: {}, order: [] },
      }),
    };
    const features = {
      forUser: jest.fn().mockResolvedValue(resolveCompanyParameters()),
      requireGame: jest.fn().mockResolvedValue(undefined),
    };
    const submissions = {
      create: jest.fn().mockResolvedValue(undefined),
      submit: jest.fn(),
    };
    const service = new ArcadeService(
      games as never,
      redis as never,
      tokens as never,
      handler as never,
      handler as never,
      handler as never,
      {} as never,
      features as never,
      submissions as never,
    );
    return {
      service,
      games,
      redis,
      tokens,
      handler,
      features,
      submissions,
      game,
    };
  };

  it('respeita os jogos habilitados da empresa no catálogo', async () => {
    const { service, games, features, game } = setup();
    features.forUser.mockResolvedValue(
      resolveCompanyParameters({ enabledGames: ['quiz-relampago'] }),
    );
    games.find.mockResolvedValue([game, { ...game, slug: 'termotech' }]);
    expect((await service.listGames(1)).map((value) => value.slug)).toEqual([
      'quiz-relampago',
    ]);
  });
  it('recusa jogo desabilitado antes de criar uma partida', async () => {
    const { service, features, submissions } = setup();
    features.requireGame.mockRejectedValue(new NotFoundException());
    await expect(service.start(1, 'quiz-relampago')).rejects.toThrow(
      NotFoundException,
    );
    expect(submissions.create).not.toHaveBeenCalled();
  });
  it('recusa jogo inexistente ou inativo', async () => {
    const { service, games } = setup();
    games.findOne.mockResolvedValue(null);
    await expect(service.start(1, 'ausente')).rejects.toThrow(
      NotFoundException,
    );
  });
  it('jogo local não usa economia de fichas', async () => {
    const { service, games, game, submissions } = setup();
    games.findOne.mockResolvedValue({
      ...game,
      game_type: ArcadeGameType.CLIENT_ONLY,
    });
    await expect(service.start(1, 'termotech')).rejects.toThrow(
      BadRequestException,
    );
    expect(submissions.create).not.toHaveBeenCalled();
  });
  it('não cria partida quando não há fichas', async () => {
    const { service, tokens, handler } = setup();
    tokens.getState.mockResolvedValue({
      balance: 0,
      cap: 5,
      nextRegenAt: null,
      nextRegenInSeconds: 10,
    });
    await expect(service.start(1, 'quiz-relampago')).rejects.toThrow(
      ForbiddenException,
    );
    expect(handler.buildRun).not.toHaveBeenCalled();
  });
  it('só retorna a partida depois de persistir a chave de correção no servidor', async () => {
    const { service, submissions, game } = setup();
    const result = await service.start(7, 'quiz-relampago');
    expect(submissions.create).toHaveBeenCalledWith(7, result.runId, game, {
      correct: {},
      order: [],
    });
    expect(result.payload).toEqual({ questions: [] });
    expect(result).not.toHaveProperty('answerKey');
  });
  it('falha no cache não perde uma partida já persistida', async () => {
    const { service, redis } = setup();
    redis.set.mockRejectedValue(new Error('fixture Redis unavailable'));
    await expect(service.start(7, 'quiz-relampago')).resolves.toHaveProperty(
      'runId',
    );
  });
  it('não anuncia partida quando a persistência SQL falha', async () => {
    const { service, redis, submissions } = setup();
    submissions.create.mockRejectedValue(new Error('fixture SQL unavailable'));
    await expect(service.start(7, 'quiz-relampago')).rejects.toThrow(
      'fixture SQL unavailable',
    );
    expect(redis.set).not.toHaveBeenCalled();
  });
});
