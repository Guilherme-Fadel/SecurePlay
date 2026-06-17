import { Controller, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AulaQuiz } from './aula-quiz.entity';
import { CreateQuizDto } from './dto/aula-quiz.dto';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';

@Controller('conteudo/quiz')
export class AulaQuizController {
  constructor(
    @Inject('AULA_QUIZ_REPOSITORY')
    private aulaQuizRepository: Repository<AulaQuiz>,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateQuizDto) {
    const quiz = this.aulaQuizRepository.create(dto);
    return this.aulaQuizRepository.save(quiz);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateQuizDto>) {
    await this.aulaQuizRepository.update(id, dto);
    return this.aulaQuizRepository.findOne({ where: { id } });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.aulaQuizRepository.delete(id);
    return { sucesso: true, mensagem: 'Pergunta removida' };
  }
}
