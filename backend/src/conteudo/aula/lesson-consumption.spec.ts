import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AulaService } from './aula.service';
import { AulaType } from './aula.entity';
import {
  cappedProgress,
  consumptionError,
  maxAllowedProgress,
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
  it('vídeo de 4 min: 5 s desde o início permitem no máximo ~4%', () => {
    expect(maxAllowedProgress(video, 5_000)).toBeCloseTo(4.17, 1);
    expect(cappedProgress(0, 100, maxAllowedProgress(video, 5_000))).toBe(4);
  });

  it('vídeo sem duração cadastrada usa no mínimo 60 s', () => {
    expect(maxAllowedProgress({ ...video, duration: 0 }, 30_000)).toBe(100);
  });

  it('leitura: a primeira página conta ao abrir; depois 1 página a cada 2 s', () => {
    expect(maxAllowedProgress(comic, 0)).toBe(25);
    expect(maxAllowedProgress(comic, 4_000)).toBe(75);
  });

  it('o limite vem do tempo total: ganho abaixo de 1 ponto não zera o avanço', () => {
    // 34 min a 1×: 10 s de vídeo valem 0,49%; o teto total libera o ponto inteiro.
    const longVideo = { ...video, duration: 34 };
    expect(cappedProgress(0, 1, maxAllowedProgress(longVideo, 30_000))).toBe(1);
  });

  it('progresso nunca diminui', () => {
    expect(cappedProgress(60, 10, 5)).toBe(60);
  });

  it('o pedido do cliente continua sendo teto', () => {
    expect(cappedProgress(0, 30, 80)).toBe(30);
  });

  it('sem conteúdo publicado não há exigência', () => {
    expect(consumptionError({ ...video, content_url: '' }, 0)).toBeNull();
    expect(consumptionError({ ...comic, pages: [] }, 0)).toBeNull();
    expect(maxAllowedProgress({ ...video, content_url: '' }, 0)).toBe(100);
  });
});

describe('A2 — simulação da sequência real do cliente', () => {
  const T0 = Date.parse('2026-11-17T10:00:00Z');
  let progress: Partial<UsuarioAula> | null;
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
    return new AulaService(
      { findOne: jest.fn().mockResolvedValue(aula) } as never,
      { count: jest.fn().mockResolvedValue(0) } as never,
      usuarioAula as never,
      {} as never,
      {} as never,
      {
        assertModuloDesbloqueado: jest.fn(),
        assertAulaDaTurma: jest.fn().mockResolvedValue(true),
      } as never,
      {
        updateProgress: jest.fn(
          (_id: number, work: (m: EntityManager) => unknown) => work(manager),
        ),
      } as never,
    );
  }

  beforeEach(() => {
    progress = null;
    // Só o relógio é simulado; as promises continuam reais.
    jest.useFakeTimers({
      now: T0,
      doNotFake: [
        'nextTick',
        'setImmediate',
        'setTimeout',
        'setInterval',
        'clearTimeout',
        'clearInterval',
        'clearImmediate',
        'queueMicrotask',
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Cliente de vídeo: salva a cada 10 s de vídeo; o relógio anda 10 s / velocidade. */
  async function watchVideo(minutes: number, speed: number) {
    const service = build({ ...video, duration: minutes });
    const total = minutes * 60;
    let percent = 0;
    await service.updateProgress(8, 1, { progress_percent: 0 });
    for (let position = 10; position <= total; position += 10) {
      jest.setSystemTime(T0 + (position / speed) * 1000);
      const saved = await service.updateProgress(8, 1, {
        progress_percent: Math.round((position / total) * 100),
      });
      percent = saved.percent;
    }
    return { service, percent };
  }

  it('vídeo de 40 min assistido a 1× chega a 90% ou mais e conclui', async () => {
    const { percent } = await watchVideo(40, 1);
    expect(percent).toBeGreaterThanOrEqual(90);
    expect(consumptionError({ ...video, duration: 40 }, percent)).toBeNull();
  });

  it('vídeo de 10 min assistido a 2× chega a 90% ou mais', async () => {
    const { percent } = await watchVideo(10, 2);
    expect(percent).toBeGreaterThanOrEqual(90);
  });

  it('salto de 0 a 100 em 5 s continua barrado', async () => {
    const service = build(video);
    await service.updateProgress(8, 1, { progress_percent: 0 });
    jest.setSystemTime(T0 + 5_000);
    const saved = await service.updateProgress(8, 1, { progress_percent: 100 });
    expect(saved.percent).toBeLessThanOrEqual(5);
  });

  /** Cliente de leitura: grava a página `n` de `total` a cada `stepMs`. */
  async function readPages(total: number, stepMs: number) {
    const pages = Array.from({ length: total }, (_, i) => `p${i + 1}.png`);
    const service = build({ ...comic, pages });
    let percent = 0;
    for (let page = 1; page <= total; page += 1) {
      jest.setSystemTime(T0 + (page - 1) * stepMs);
      const saved = await service.updateProgress(8, 1, {
        progress_percent: Math.min(99, Math.round((page / total) * 100)),
        last_page: page - 1,
      });
      percent = saved.percent;
    }
    return percent;
  }

  it('leitura: 10 páginas, uma a cada 2,5 s, chegam a 99%', async () => {
    expect(await readPages(10, 2_500)).toBe(99);
  });

  it('leitura: 10 páginas em 3 s não chegam a 99%', async () => {
    expect(await readPages(10, 3_000 / 9)).toBeLessThan(99);
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
