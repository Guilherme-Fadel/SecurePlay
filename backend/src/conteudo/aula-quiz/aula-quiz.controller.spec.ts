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
    merge: jest.Mock;
    manager: { transaction: jest.Mock };
  };

  beforeEach(() => {
    repository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      merge: jest.fn((entity, value) => Object.assign(entity, value)),
      manager: { transaction: jest.fn() },
    };
    repository.manager.transaction.mockImplementation((work) =>
      work({ getRepository: () => repository }),
    );
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

  it('rejeita pergunta composta apenas por espaços no DTO e no controller', async () => {
    const dto = Object.assign(new CreateQuizDto(), {
      aula_id: 4,
      text: '   \t',
      options: ['Sim', 'Não'],
      correct_index: 0,
    });

    expect((await validate(dto)).map((error) => error.property)).toContain('text');
    await expect(controller.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('remove aula_id não permitida pelo whitelist da aplicação', async () => {
    const dto = Object.assign(new UpdateQuizDto(), {
      aula_id: 99,
      text: 'Atualizada',
    });

    expect(await validate(dto, { whitelist: true })).toHaveLength(0);
    expect('aula_id' in dto).toBe(false);
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
    expect(repository.manager.transaction).toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejeita edição vazia e pergunta inexistente sem gravar', async () => {
    await expect(
      controller.update(8, new UpdateQuizDto()),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.findOne.mockResolvedValueOnce(null);
    await expect(
      controller.update(404, Object.assign(new UpdateQuizDto(), { text: 'x' })),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('bloqueia a pergunta durante a validação e grava a edição no mesmo registro', async () => {
    const existing = {
      id: 8,
      text: 'Pergunta antiga',
      options: ['A', 'B', 'C', 'D'],
      correct_index: 3,
    };
    repository.findOne.mockResolvedValue(existing);
    const dto = Object.assign(new UpdateQuizDto(), {
      options: ['A', 'B'],
      correct_index: 1,
    });

    const result = await controller.update(8, dto);

    expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 8 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(repository.save).toHaveBeenCalledWith({
      ...existing,
      options: ['A', 'B'],
      correct_index: 1,
    });
    expect(result).toEqual(existing);
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
