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
    const existing = await this.aulaQuizRepository.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Pergunta não encontrada');
    if (!Object.values(dto ?? {}).some((value) => value !== undefined)) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualização',
      );
    }
    const options = dto.options ?? existing.options;
    const correctIndex = dto.correct_index ?? existing.correct_index;
    this.assertValidAnswer(options, correctIndex);
    await this.aulaQuizRepository.update(id, dto);
    return this.aulaQuizRepository.findOne({ where: { id } });
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
}
