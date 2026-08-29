import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ArcadeService } from './arcade.service';
import { RedisService } from '../redis/redis.service';
import { XpService } from '../common/gamification/xp.service';
import { TokenService } from './token.service';
import { QuizRelampagoHandler } from './games/quiz-relampago.handler';
import { PhishingHandler } from './games/phishing.handler';
import { DataClassifyHandler } from './games/data-classify.handler';
import { ArcadeGameType } from './entities/arcade-game.entity';

describe('ArcadeService (ciclo start/submit e XP)', () => {
  let service: ArcadeService;
  let store: Map<string, string>;
  let gameRepository: { findOne: jest.Mock; find: jest.Mock };
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    incrBy: jest.Mock;
  };
  let xpService: { creditXp: jest.Mock };
  let tokenService: { consume: jest.Mock; getState: jest.Mock };
  let quizHandler: { buildRun: jest.Mock; correct: jest.Mock };
  let phishingHandler: { buildRun: jest.Mock; correct: jest.Mock };
  let phishingRepository: {
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let dataHandler: { buildRun: jest.Mock; correct: jest.Mock };
  let dataRepository: { count: jest.Mock; create: jest.Mock; save: jest.Mock };

  const quizGame = {
    slug: 'quiz-relampago',
    title: 'Quiz Relampago',
    game_type: ArcadeGameType.QUIZ,
    xp_base: 100,
    active: true,
  };

  beforeEach(async () => {
    store = new Map();
    gameRepository = {
      findOne: jest.fn().mockResolvedValue(quizGame),
      find: jest.fn().mockResolvedValue([quizGame]),
    };
    redis = {
      get: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      set: jest.fn((k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      }),
      del: jest.fn((k: string) => {
        store.delete(k);
        return Promise.resolve(1);
      }),
      incrBy: jest.fn(),
    };
    xpService = { creditXp: jest.fn() };
    tokenService = {
      consume: jest.fn().mockResolvedValue({
        ok: true,
        state: {
          balance: 4,
          cap: 5,
          nextRegenInSeconds: 0,
          nextRegenAt: null,
        },
      }),
      getState: jest.fn().mockResolvedValue({
        balance: 5,
        cap: 5,
        nextRegenInSeconds: 0,
        nextRegenAt: null,
      }),
    };
    quizHandler = {
      buildRun: jest.fn().mockResolvedValue({
        payload: { questions: [] },
        answerKey: { correct: {}, order: [] },
      }),
      correct: jest.fn().mockReturnValue({ score: 100, feedback: {} }),
    };
    phishingHandler = {
      buildRun: jest.fn().mockResolvedValue({
        payload: { samples: [] },
        answerKey: { samples: {}, order: [] },
      }),
      correct: jest.fn().mockReturnValue({ score: 100, feedback: {} }),
    };
    dataHandler = {
      buildRun: jest.fn().mockResolvedValue({
        payload: { items: [] },
        answerKey: { items: {}, order: [] },
      }),
      correct: jest.fn().mockReturnValue({ score: 100, feedback: {} }),
    };
    phishingRepository = {
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn((x: unknown) => x),
      save: jest.fn(),
    };
    dataRepository = {
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn((x: unknown) => x),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArcadeService,
        { provide: 'ARCADE_GAME_REPOSITORY', useValue: gameRepository },
        { provide: RedisService, useValue: redis },
        { provide: XpService, useValue: xpService },
        { provide: TokenService, useValue: tokenService },
        { provide: QuizRelampagoHandler, useValue: quizHandler },
        { provide: PhishingHandler, useValue: phishingHandler },
        { provide: DataClassifyHandler, useValue: dataHandler },
        { provide: 'PHISHING_SAMPLE_REPOSITORY', useValue: phishingRepository },
        { provide: 'DATA_ITEM_REPOSITORY', useValue: dataRepository },
      ],
    }).compile();

    service = module.get<ArcadeService>(ArcadeService);
  });

  it('recusa start de jogo inexistente/inativo', async () => {
    gameRepository.findOne.mockResolvedValue(null);
    await expect(service.start(1, 'nao-existe')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('recusa start de jogo CLIENT_ONLY', async () => {
    gameRepository.findOne.mockResolvedValue({
      ...quizGame,
      slug: 'termotech',
      game_type: ArcadeGameType.CLIENT_ONLY,
    });
    await expect(service.start(1, 'termotech')).rejects.toThrow(
      BadRequestException,
    );
    expect(tokenService.consume).not.toHaveBeenCalled();
  });

  it('recusa start quando nao ha tokens (nao cria run)', async () => {
    tokenService.getState.mockResolvedValue({
      balance: 0,
      cap: 5,
      nextRegenInSeconds: 600,
      nextRegenAt: 1,
    });
    await expect(service.start(1, 'quiz-relampago')).rejects.toThrow(
      ForbiddenException,
    );
    expect(tokenService.consume).not.toHaveBeenCalled();
    expect(quizHandler.buildRun).not.toHaveBeenCalled();
  });

  it('start preserva a ficha e grava a run', async () => {
    const res = await service.start(1, 'quiz-relampago');
    expect(tokenService.getState).toHaveBeenCalledWith(1);
    expect(tokenService.consume).not.toHaveBeenCalled();
    expect(res.runId).toBeDefined();
    expect(store.has(`arcade-run:1:${res.runId}`)).toBe(true);
  });

  it('submit consome uma ficha mesmo quando a pontuacao e zero', async () => {
    quizHandler.correct.mockReturnValue({ score: 0, feedback: {} });
    redis.incrBy.mockResolvedValue(1);
    const start = await service.start(1, 'quiz-relampago');
    const res = await service.submit(1, start.runId, { quizAnswers: [] });
    expect(tokenService.consume).toHaveBeenCalledTimes(1);
    expect(tokenService.consume).toHaveBeenCalledWith(1);
    expect(res.tokens.balance).toBe(4);
  });

  it('submit sem ficha nao corrige, nao credita XP e preserva a run', async () => {
    tokenService.consume.mockResolvedValue({
      ok: false,
      state: { balance: 0, cap: 5, nextRegenInSeconds: 600, nextRegenAt: 1 },
    });
    const start = await service.start(1, 'quiz-relampago');
    await expect(
      service.submit(1, start.runId, { quizAnswers: [] }),
    ).rejects.toThrow(ForbiddenException);
    expect(quizHandler.correct).not.toHaveBeenCalled();
    expect(xpService.creditXp).not.toHaveBeenCalled();
    expect(store.has(`arcade-run:1:${start.runId}`)).toBe(true);
  });

  it('1a conclusao do dia credita 100% do XP base', async () => {
    redis.incrBy.mockResolvedValue(1);
    const start = await service.start(1, 'quiz-relampago');
    const res = await service.submit(1, start.runId, { quizAnswers: [] });
    expect(res.multiplier).toBe(1);
    expect(res.xpEarned).toBe(100);
    expect(xpService.creditXp).toHaveBeenCalledWith(1, 100);
  });

  it('2a conclusao aplica 50%', async () => {
    redis.incrBy.mockResolvedValue(2);
    const start = await service.start(1, 'quiz-relampago');
    const res = await service.submit(1, start.runId, { quizAnswers: [] });
    expect(res.multiplier).toBe(0.5);
    expect(res.xpEarned).toBe(50);
  });

  it('3a+ conclusao aplica 25% respeitando piso 10', async () => {
    redis.incrBy.mockResolvedValue(3);
    const start = await service.start(1, 'quiz-relampago');
    const res = await service.submit(1, start.runId, { quizAnswers: [] });
    expect(res.multiplier).toBe(0.25);
    expect(res.xpEarned).toBe(25);
  });

  it('aplica piso de 10 quando o calculado fica abaixo', async () => {
    quizHandler.correct.mockReturnValue({ score: 20, feedback: {} });
    redis.incrBy.mockResolvedValue(3);
    const start = await service.start(1, 'quiz-relampago');
    const res = await service.submit(1, start.runId, { quizAnswers: [] });
    expect(res.xpBase).toBe(20);
    expect(res.xpEarned).toBe(10);
  });

  it('xpBase 0 concede 0 (sem piso)', async () => {
    quizHandler.correct.mockReturnValue({ score: 0, feedback: {} });
    redis.incrBy.mockResolvedValue(1);
    const start = await service.start(1, 'quiz-relampago');
    const res = await service.submit(1, start.runId, { quizAnswers: [] });
    expect(res.xpEarned).toBe(0);
    expect(xpService.creditXp).toHaveBeenCalledWith(1, 0);
  });

  it('submit apaga a run e o segundo submit e recusado (idempotencia)', async () => {
    redis.incrBy.mockResolvedValue(1);
    const start = await service.start(1, 'quiz-relampago');
    await service.submit(1, start.runId, { quizAnswers: [] });
    await expect(
      service.submit(1, start.runId, { quizAnswers: [] }),
    ).rejects.toThrow(BadRequestException);
  });
});
