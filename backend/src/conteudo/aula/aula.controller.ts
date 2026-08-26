import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { AulaService } from './aula.service';
import { CreateAulaDto, UpdateAulaDto } from './dto/aula.dto';
import { SubmitQuizDto } from '../aula-quiz/dto/aula-quiz.dto';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';
import { Throttle } from '@nestjs/throttler';

@Controller('conteudo/aulas')
export class AulaController {
  constructor(private readonly aulaService: AulaService) {}

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.aulaService.findOne(id, req.user.userId);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateAulaDto) {
    return this.aulaService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAulaDto,
  ) {
    return this.aulaService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.aulaService.delete(id);
  }

  @Post(':id/concluir')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async concluir(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.aulaService.concluir(id, req.user.userId);
  }

  @Post(':id/quiz')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async submitQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitQuizDto,
    @Request() req: any,
  ) {
    return this.aulaService.submitQuiz(id, req.user.userId, dto);
  }
}
