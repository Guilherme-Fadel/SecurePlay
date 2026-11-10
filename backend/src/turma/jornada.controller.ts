import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { JornadaEdicaoService } from './jornada-edicao.service';
import { DefinirAberturaDto, SalvarModulosDto } from './dto/jornada.dto';
import { PaginacaoDto } from './dto/listar-turmas.dto';

type AtorRequest = { user: { userId: number } };

/** Jornada da turma: professores vinculados, admin da escola e plataforma (escopo no service). */
@Controller('turmas')
@Roles(Role.ADMIN, Role.TEACHER, Role.PLATFORM_ADMIN)
export class JornadaController {
  constructor(private readonly jornada: JornadaEdicaoService) {}

  @Get('minhas')
  minhas(@Request() req: AtorRequest) {
    return this.jornada.minhas(req.user.userId);
  }

  @Get(':turmaId/jornada')
  obter(
    @Request() req: AtorRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
  ) {
    return this.jornada.obter(req.user.userId, turmaId);
  }

  @Put(':turmaId/jornada/modulos')
  salvarModulos(
    @Request() req: AtorRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Body() dto: SalvarModulosDto,
  ) {
    return this.jornada.salvarModulos(req.user.userId, turmaId, dto.modulo_ids);
  }

  @Put(':turmaId/jornada/aulas/:aulaId/abertura')
  definirAbertura(
    @Request() req: AtorRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Param('aulaId', ParseIntPipe) aulaId: number,
    @Body() dto: DefinirAberturaDto,
  ) {
    return this.jornada.definirAbertura(
      req.user.userId,
      turmaId,
      aulaId,
      dto.modo === 'agora'
        ? { modo: 'agora' }
        : { modo: 'agendar', abre_em: dto.abre_em! },
    );
  }

  @Delete(':turmaId/jornada/aulas/:aulaId/abertura')
  cancelarAbertura(
    @Request() req: AtorRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Param('aulaId', ParseIntPipe) aulaId: number,
  ) {
    return this.jornada.cancelarAbertura(req.user.userId, turmaId, aulaId);
  }

  @Get(':turmaId/alunos')
  alunos(
    @Request() req: AtorRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Query() filtros: PaginacaoDto,
  ) {
    return this.jornada.alunosDaTurma(req.user.userId, turmaId, filtros);
  }
}
