import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import {
  CreateQuizDto,
  DeleteQuizDto,
  UpdateQuizDto,
} from './dto/aula-quiz.dto';
import { AulaQuizController } from './aula-quiz.controller';

describe('AulaQuizController', () => {
  let controller: AulaQuizController;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    controller = new AulaQuizController(repository as never);
  });

  it('rejeita DTOs com índice correto fora das alternativas ou alternativas vazias', async () => {
    const dto = Object.assign(new CreateQuizDto(), {
      aula_id: 4,
      text: 'Pergunta',
      options: ['Sim', ''],
      correct_index: 2,
    });

    expect((await validate(dto)).length).toBeGreaterThan(0);
    await expect(controller.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('não permite mover a pergunta para outra aula pela DTO de edição', async () => {
    const dto = Object.assign(new UpdateQuizDto(), {
      aula_id: 99,
      text: 'Atualizada',
    });

    expect(
      (
        await validate(dto, { whitelist: true, forbidNonWhitelisted: true })
      ).map((e) => e.property),
    ).toContain('aula_id');
  });

  it('valida índice e alternativas combinando campos atuais e alterados', async () => {
    repository.findOne.mockResolvedValue({
      id: 8,
      options: ['A', 'B', 'C'],
      correct_index: 2,
    });

    await expect(
      controller.update(
        8,
        Object.assign(new UpdateQuizDto(), { options: ['A', 'B'] }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejeita edição vazia e pergunta inexistente sem gravar', async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 8,
      options: ['A', 'B'],
      correct_index: 1,
    });
    await expect(
      controller.update(8, new UpdateQuizDto()),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.findOne.mockResolvedValueOnce(null);
    await expect(
      controller.update(404, Object.assign(new UpdateQuizDto(), { text: 'x' })),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('só exclui mediante confirmação explícita true', async () => {
    await expect(
      controller.delete(8, new DeleteQuizDto()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.delete).not.toHaveBeenCalled();

    await controller.delete(
      8,
      Object.assign(new DeleteQuizDto(), { confirm: true }),
    );
    expect(repository.delete).toHaveBeenCalledWith(8);
  });
});
