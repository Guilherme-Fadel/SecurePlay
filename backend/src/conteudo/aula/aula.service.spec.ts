import { AulaService } from './aula.service';
import { BadRequestException } from '@nestjs/common';

describe('AulaService (progresso parcial)', () => {
  let service: AulaService;
  let aulaRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let usuarioAulaRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let aulaQuizRepository: { find: jest.Mock; count: jest.Mock };
  let s3Service: { generatePresignedGetUrl: jest.Mock };
  let moduloService: { assertModuloDesbloqueado: jest.Mock };

  beforeEach(() => {
    aulaRepository = { findOne: jest.fn(), find: jest.fn() };
    usuarioAulaRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    aulaQuizRepository = { find: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) };
    s3Service = { generatePresignedGetUrl: jest.fn() };
    // por padrao o modulo esta liberado; os testes de aula validam o bloqueio sequencial de aula
    moduloService = {
      assertModuloDesbloqueado: jest.fn().mockResolvedValue(undefined),
    };

    service = new AulaService(
      aulaRepository as never,
      aulaQuizRepository as never,
      usuarioAulaRepository as never,
      {} as never,
      {} as never,
      {} as never,
      s3Service as never,
      {} as never,
      {} as never,
      moduloService as never,
    );
  });

  it('cria o progresso ao acessar uma aula pela primeira vez', async () => {
    aulaRepository.findOne.mockResolvedValueOnce({
      id: 7,
      modulo_id: 2,
      order: 10,
      active: true,
    });
    aulaRepository.find.mockResolvedValue([
      {
        id: 7,
        modulo_id: 2,
        order: 10,
        section_name: 'Capitulo 1',
        active: true,
      },
    ]);
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
    aulaRepository.findOne.mockResolvedValueOnce({
      id: 7,
      modulo_id: 2,
      order: 10,
      active: true,
    });
    aulaRepository.find.mockResolvedValue([
      {
        id: 7,
        modulo_id: 2,
        order: 10,
        section_name: 'Capitulo 1',
        active: true,
      },
    ]);
    usuarioAulaRepository.findOne.mockResolvedValue(existing);

    const result = await service.updateProgress(7, 3, {
      progress_percent: 40,
      last_video_second: 120,
    });

    expect(result.percent).toBe(70);
    expect(result.lastVideoSecond).toBe(120);
  });

  it('nega o conteúdo de uma aula bloqueada antes de assinar URLs ou expor o quiz', async () => {
    aulaRepository.findOne.mockResolvedValueOnce({
      id: 7,
      modulo_id: 2,
      order: 2,
      section_name: 'Capitulo 1',
      active: true,
    });
    aulaRepository.find.mockResolvedValue([
      {
        id: 6,
        modulo_id: 2,
        order: 1,
        section_name: 'Capitulo 1',
        active: true,
      },
      {
        id: 7,
        modulo_id: 2,
        order: 2,
        section_name: 'Capitulo 1',
        active: true,
      },
    ]);
    usuarioAulaRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(7, 3)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('entrega páginas textuais e quiz sem resolver texto como URL nem expor o gabarito', async () => {
    aulaRepository.findOne.mockResolvedValueOnce({
      id: 77,
      modulo_id: 50,
      order: 1,
      title: 'Segurança digital',
      type: 'texto',
      pages: ['Objetivo da aula\n\nProteja suas contas.'],
      content_url: null,
      active: true,
    });
    aulaRepository.find.mockResolvedValue([{ id: 77, modulo_id: 50, order: 1 }]);
    usuarioAulaRepository.findOne.mockResolvedValue(null);
    aulaQuizRepository.find.mockResolvedValue([{ id: 9, text: 'O que fazer?', options: ['Verificar', 'Ignorar'], correct_index: 0, order: 1 }]);

    const result = await service.findOne(77, 3);

    expect(result.pages).toEqual(['Objetivo da aula\n\nProteja suas contas.']);
    expect(result.quiz).toEqual([{ id: 9, text: 'O que fazer?', options: ['Verificar', 'Ignorar'], order: 1 }]);
    expect(s3Service.generatePresignedGetUrl).not.toHaveBeenCalled();
  });

  it('impede concluir diretamente uma aula textual que possui quiz', async () => {
    aulaRepository.findOne.mockResolvedValueOnce({ id: 77, modulo_id: 50, type: 'texto', active: true });
    aulaQuizRepository.count.mockResolvedValue(3);

    await expect(service.concluir(77, 3)).rejects.toThrow(/responda ao quiz/i);
    expect(usuarioAulaRepository.save).not.toHaveBeenCalled();
  });

  it('rejeita respostas duplicadas antes de pontuar ou creditar XP', async () => {
    aulaRepository.findOne.mockResolvedValueOnce({ id: 77, modulo_id: 50, order: 1, type: 'texto', active: true });
    aulaRepository.find.mockResolvedValue([{ id: 77, modulo_id: 50, order: 1 }]);
    usuarioAulaRepository.findOne.mockResolvedValue(null);
    aulaQuizRepository.find.mockResolvedValue([
      { id: 1, options: ['Sim', 'Não'], correct_index: 0 },
      { id: 2, options: ['Sim', 'Não'], correct_index: 1 },
    ]);

    await expect(service.submitQuiz(77, 3, {
      answers: [
        { questionId: 1, selectedIndex: 0 },
        { questionId: 1, selectedIndex: 0 },
      ],
    })).rejects.toThrow(/cada pergunta uma vez/i);
    expect(usuarioAulaRepository.save).not.toHaveBeenCalled();
  });

  it('nao pula para a primeira aula do capitulo seguinte', async () => {
    const capitulo1Aula1 = {
      id: 10,
      modulo_id: 2,
      order: 1,
      section_name: 'Missao do guardiao',
      active: true,
    };
    const capitulo1Aula2 = {
      id: 11,
      modulo_id: 2,
      order: 2,
      section_name: 'Missao do guardiao',
      active: true,
    };
    const capitulo2Aula1 = {
      id: 20,
      modulo_id: 2,
      order: 1,
      section_name: 'Pistas digitais',
      active: true,
    };

    aulaRepository.findOne.mockResolvedValueOnce(capitulo2Aula1);
    aulaRepository.find.mockResolvedValue([
      capitulo1Aula1,
      capitulo2Aula1,
      capitulo1Aula2,
    ]);
    usuarioAulaRepository.find.mockResolvedValue([
      { aula_id: capitulo1Aula1.id, completed: true },
    ]);

    await expect(service.findOne(capitulo2Aula1.id, 3)).rejects.toThrow(
      /aula anterior/i,
    );
    expect(usuarioAulaRepository.find).toHaveBeenCalledWith({
      where: { usuario_id: 3, completed: true },
    });
  });
});
