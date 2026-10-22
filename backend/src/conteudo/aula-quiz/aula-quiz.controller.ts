import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AulaQuiz } from './aula-quiz.entity';
import {
  CreateQuizDto,
  DeleteQuizDto,
  UpdateQuizDto,
} from './dto/aula-quiz.dto';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';

@Controller('conteudo/quiz')
export class AulaQuizController {
  constructor(
    @Inject('AULA_QUIZ_REPOSITORY')
    private aulaQuizRepository: Repository<AulaQuiz>,
  ) {}

  @Post()
  @Roles(Role.PLATFORM_ADMIN)
  async create(@Body() dto: CreateQuizDto) {
    this.assertValidQuestionText(dto.text);
    this.assertValidAnswer(dto.options, dto.correct_index);
    const quiz = this.aulaQuizRepository.create(dto);
    return this.aulaQuizRepository.save(quiz);
  }

  @Patch(':id')
  @Roles(Role.PLATFORM_ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuizDto,
  ) {
    if (!Object.values(dto ?? {}).some((value) => value !== undefined)) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualização',
      );
    }
    if (dto.text !== undefined) this.assertValidQuestionText(dto.text);
    return this.aulaQuizRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(AulaQuiz);
      const existing = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!existing) throw new NotFoundException('Pergunta não encontrada');

      const options = dto.options ?? existing.options;
      const correctIndex = dto.correct_index ?? existing.correct_index;
      this.assertValidAnswer(options, correctIndex);
      return repository.save(repository.merge(existing, dto));
    });
  }

  @Delete(':id')
  @Roles(Role.PLATFORM_ADMIN)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeleteQuizDto,
  ) {
    if (dto?.confirm !== true) {
      throw new BadRequestException('Confirme a remoção da pergunta');
    }
    await this.aulaQuizRepository.delete(id);
    return { sucesso: true, mensagem: 'Pergunta removida' };
  }

  private assertValidAnswer(options: unknown, correctIndex: unknown) {
    if (
      !Array.isArray(options) ||
      options.length < 2 ||
      options.some((option) => typeof option !== 'string' || !option.trim()) ||
      !Number.isInteger(correctIndex) ||
      (correctIndex as number) < 0 ||
      (correctIndex as number) >= options.length
    ) {
      throw new BadRequestException(
        'Alternativas ou resposta correta inválidas',
      );
    }
  }

  private assertValidQuestionText(text: unknown) {
    if (typeof text !== 'string' || !text.trim()) {
      throw new BadRequestException('A pergunta não pode ficar vazia');
    }
  }
}
