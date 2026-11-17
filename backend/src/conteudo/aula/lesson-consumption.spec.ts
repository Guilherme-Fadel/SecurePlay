import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AulaService } from './aula.service';
import { AulaType } from './aula.entity';
import {
  cappedProgress,
  consumptionError,
  maxProgressGain,
} from './lesson-consumption';
import { UsuarioAula } from '../usuario-aula/usuario-aula.entity';

const video = {
  id: 8,
  modulo_id: 2,
  order: 1,
  active: true,
  xp: 50,
  type: AulaType.VIDEO,
  duration: 4,
  content_url: 'aulas/video.mp4',
  pages: null as unknown as string[],
};
const comic = {
  ...video,
  id: 9,
  type: AulaType.QUADRINHO,
  content_url: null as unknown as string,
  pages: ['p1.png', 'p2.png', 'p3.png', 'p4.png'],
};

describe('A2 — regras de consumo', () => {
  it('vídeo de 4 min: 5 s permitem no máximo ~4%', () => {
    expect(maxProgressGain(video, 5_000, false)).toBeCloseTo(4.17, 1);
    expect(cappedProgress(0, 100, maxProgressGain(video, 5_000, false))).toBe(
      4,
    );
  });

  it('vídeo sem duração cadastrada usa no mínimo 60 s', () => {
    expect(maxProgressGain({ ...video, duration: 0 }, 30_000, false)).toBe(100);
  });

  it('leitura: a primeira página conta ao abrir; depois 1 página a cada 2 s', () => {
    expect(maxProgressGain(comic, 0, true)).toBe(25);
    expect(maxProgressGain(comic, 4_000, false)).toBe(50);
  });

  it('progresso nunca diminui', () => {
    expect(cappedProgress(60, 10, 5)).toBe(60);
  });

  it('sem conteúdo publicado não há exigência', () => {
    expect(consumptionError({ ...video, content_url: '' }, 0)).toBeNull();
    expect(consumptionError({ ...comic, pages: [] }, 0)).toBeNull();
  });
});

describe('A2 — AulaService exige consumo', () => {
  let progress: Partial<UsuarioAula> | null;
  let quizCount: number;
  let service: AulaService;
  const usuarioAula = {
    findOne: jest.fn(() => Promise.resolve(progress)),
    create: jest.fn((value: Partial<UsuarioAula>) => value),
    save: jest.fn((value: Partial<UsuarioAula>) => {
      progress = { ...value };
      return Promise.resolve(value);
    }),
  };
  const manager = {
    getRepository: () => usuarioAula,
  } as unknown as EntityManager;

  function build(aula: object) {
    const instance = new AulaService(
      { findOne: jest.fn().mockResolvedValue(aula) } as never,
      {
        count: jest.fn(() => Promise.resolve(quizCount)),
        find: jest.fn(() =>
          Promise.resolve(
            quizCount
              ? [{ id: 1, options: ['A', 'B'], correct_index: 0, order: 1 }]
              : [],
          ),
        ),
      } as never,
      usuarioAula as never,
      {} as never,
      {} as never,
      {
        assertModuloDesbloqueado: jest.fn(),
        assertAulaDaTurma: jest.fn().mockResolvedValue(true),
      } as never,
      {
        replay: jest.fn().mockResolvedValue(null),
        updateProgress: jest.fn(
          (_id: number, work: (m: EntityManager) => unknown) => work(manager),
        ),
        complete: jest.fn(
          async (
            _u: number,
            _k: string,
            _s: number,
            work: (m: EntityManager) => Promise<{ result: unknown }>,
          ) => (await work(manager)).result,
        ),
      } as never,
    );
    const internals = instance as unknown as Record<string, jest.Mock>;
    jest
      .spyOn(internals, 'verificarDesbloqueio' as never)
      .mockResolvedValue(undefined as never);
    jest
      .spyOn(internals, 'completeModule' as never)
      .mockResolvedValue({ xp: 0, notifications: [] } as never);
    return instance;
  }

  beforeEach(() => {
    progress = null;
    quizCount = 0;
    jest.clearAllMocks();
  });

  it('concluir recusa vídeo com 0%', async () => {
    service = build(video);
    await expect(service.concluir(8, 1)).rejects.toThrow(
      'Assista a pelo menos 90% do vídeo',
    );
  });

  it('PATCH não salta de 0 a 100 em 5 s', async () => {
    service = build(video);
    const fiveSecondsAgo = new Date(Date.now() - 5_000);
    progress = {
      usuario_id: 1,
      aula_id: 8,
      completed: false,
      progress_percent: 0,
      started_at: fiveSecondsAgo,
      last_accessed_at: fiveSecondsAgo,
    };
    const saved = await service.updateProgress(8, 1, { progress_percent: 100 });
    expect(saved.percent).toBeLessThanOrEqual(5);
  });

  it('concluir aceita vídeo com 90% após tempo compatível', async () => {
    service = build(video);
    const twoMinutesAgo = new Date(Date.now() - 120_000);
    progress = {
      usuario_id: 1,
      aula_id: 8,
      completed: false,
      progress_percent: 0,
      started_at: twoMinutesAgo,
      last_accessed_at: twoMinutesAgo,
    };
    const saved = await service.updateProgress(8, 1, { progress_percent: 92 });
    expect(saved.percent).toBe(92);
    await expect(service.concluir(8, 1)).resolves.toMatchObject({
      sucesso: true,
    });
  });

  it('quadrinho sem quiz exige a última página', async () => {
    service = build(comic);
    progress = { completed: false, progress_percent: 75 };
    await expect(service.concluir(9, 1)).rejects.toThrow(
      'Leia até a última página',
    );
    progress = { completed: false, progress_percent: 99 };
    await expect(service.concluir(9, 1)).resolves.toMatchObject({
      sucesso: true,
    });
  });

  it('vídeo com quiz conclui pelo quiz', async () => {
    quizCount = 1;
    service = build(video);
    progress = { completed: false, progress_percent: 95 };
    await expect(service.concluir(8, 1)).rejects.toThrow(
      'Responda ao quiz para concluir esta aula',
    );
    await expect(
      service.submitQuiz(8, 1, {
        answers: [{ questionId: 1, selectedIndex: 0 }],
      }),
    ).resolves.toMatchObject({ score: 100 });
  });

  it('quiz antes de assistir 90% do vídeo é recusado', async () => {
    quizCount = 1;
    service = build(video);
    progress = { completed: false, progress_percent: 40 };
    await expect(
      service.submitQuiz(8, 1, {
        answers: [{ questionId: 1, selectedIndex: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aula já concluída não muda (o replay continua valendo)', async () => {
    service = build(video);
    progress = { completed: true, progress_percent: 100 };
    await expect(service.concluir(8, 1)).rejects.toThrow(
      'Aula já foi concluída',
    );
  });
});
