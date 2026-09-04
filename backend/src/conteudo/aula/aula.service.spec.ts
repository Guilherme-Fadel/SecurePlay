import { AulaService } from './aula.service';
import { BadRequestException } from '@nestjs/common';

describe('AulaService (progresso parcial)', () => {
  let service: AulaService;
  let aulaRepository: { findOne: jest.Mock };
  let usuarioAulaRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let moduloService: { assertModuloDesbloqueado: jest.Mock };

  beforeEach(() => {
    aulaRepository = { findOne: jest.fn() };
    usuarioAulaRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    // por padrao o modulo esta liberado; os testes de aula validam o bloqueio sequencial de aula
    moduloService = {
      assertModuloDesbloqueado: jest.fn().mockResolvedValue(undefined),
    };

    service = new AulaService(
      aulaRepository as never,
      {} as never,
      usuarioAulaRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      moduloService as never,
    );
  });

  it('cria o progresso ao acessar uma aula pela primeira vez', async () => {
    aulaRepository.findOne
      .mockResolvedValueOnce({ id: 7, modulo_id: 2, order: 10, active: true })
      .mockResolvedValueOnce(null);
    usuarioAulaRepository.findOne.mockResolvedValue(null);

    const result = await service.updateProgress(7, 3, {
      progress_percent: 35,
      last_video_second: 90,
    });

    expect(usuarioAulaRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ usuario_id: 3, aula_id: 7, completed: false }),
    );
    expect(usuarioAulaRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ progress_percent: 35, last_video_second: 90 }),
    );
    expect(result.percent).toBe(35);
  });

  it('nao reduz o percentual ja alcancado ao salvar uma posicao anterior', async () => {
    const existing = {
      id: 11,
      usuario_id: 3,
      aula_id: 7,
      completed: false,
      progress_percent: 70,
      last_video_second: 210,
      last_page: null,
      started_at: new Date(),
      last_accessed_at: new Date(),
    };
    aulaRepository.findOne
      .mockResolvedValueOnce({ id: 7, modulo_id: 2, order: 10, active: true })
      .mockResolvedValueOnce(null);
    usuarioAulaRepository.findOne.mockResolvedValue(existing);

    const result = await service.updateProgress(7, 3, {
      progress_percent: 40,
      last_video_second: 120,
    });

    expect(result.percent).toBe(70);
    expect(result.lastVideoSecond).toBe(120);
  });

  it('nega o conteúdo de uma aula bloqueada antes de assinar URLs ou expor o quiz', async () => {
    aulaRepository.findOne
      .mockResolvedValueOnce({ id: 7, modulo_id: 2, order: 2, active: true })
      .mockResolvedValueOnce({ id: 6, modulo_id: 2, order: 1, active: true });
    usuarioAulaRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(7, 3)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
