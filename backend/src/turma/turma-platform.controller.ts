import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { TurmaService } from './turma.service';
import { SalvarTurmaDto } from './dto/salvar-turma.dto';
import {
  ListarTurmasDto,
  ListarTurmasPlataformaDto,
  PaginacaoDto,
} from './dto/listar-turmas.dto';
import { VincularProfessorDto } from './dto/vincular-professor.dto';
import { AdicionarAlunosDto } from './dto/adicionar-alunos.dto';

type AdminRequest = { user: { userId: number } };

/** Mesmas operações da escola, com a empresa escolhida pela plataforma na rota. */
@Controller('platform/admin/empresas/:empresaId/turmas')
@Roles(Role.PLATFORM_ADMIN)
export class TurmaPlatformController {
  constructor(private readonly turmas: TurmaService) {}

  @Get()
  async listar(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Query() filtros: ListarTurmasDto,
  ) {
    await this.turmas.assertEmpresa(empresaId);
    return this.turmas.listar(empresaId, filtros);
  }

  @Post()
  async criar(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: SalvarTurmaDto,
  ) {
    await this.turmas.assertEmpresa(empresaId);
    return this.turmas.criar(req.user.userId, empresaId, dto);
  }

  @Put(':turmaId')
  atualizar(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Body() dto: SalvarTurmaDto,
  ) {
    return this.turmas.atualizar(req.user.userId, empresaId, turmaId, dto);
  }

  @Post(':turmaId/arquivar')
  arquivar(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
  ) {
    return this.turmas.arquivar(req.user.userId, empresaId, turmaId);
  }

  @Post(':turmaId/reativar')
  reativar(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
  ) {
    return this.turmas.reativar(req.user.userId, empresaId, turmaId);
  }

  @Get(':turmaId/professores')
  professores(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
  ) {
    return this.turmas.listarProfessores(empresaId, turmaId);
  }

  @Post(':turmaId/professores')
  async vincularProfessor(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Body() dto: VincularProfessorDto,
  ) {
    await this.turmas.vincularProfessor(
      req.user.userId,
      empresaId,
      turmaId,
      dto.usuario_id,
    );
    return { sucesso: true };
  }

  @Delete(':turmaId/professores/:usuarioId')
  async desvincularProfessor(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    await this.turmas.desvincularProfessor(
      req.user.userId,
      empresaId,
      turmaId,
      usuarioId,
    );
    return { sucesso: true };
  }

  @Get(':turmaId/alunos')
  alunos(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Query() filtros: PaginacaoDto,
  ) {
    return this.turmas.listarAlunos(empresaId, turmaId, filtros);
  }

  @Post(':turmaId/alunos')
  adicionarAlunos(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Body() dto: AdicionarAlunosDto,
  ) {
    return this.turmas.adicionarAlunos(
      req.user.userId,
      empresaId,
      turmaId,
      dto.usuario_ids,
    );
  }

  @Delete(':turmaId/alunos/:usuarioId')
  async removerAluno(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    await this.turmas.removerAluno(
      req.user.userId,
      empresaId,
      turmaId,
      usuarioId,
    );
    return { sucesso: true };
  }
}

/** Plataforma: turmas de todas as escolas numa grade só, com filtro opcional de escola. */
@Controller('platform/admin/turmas')
@Roles(Role.PLATFORM_ADMIN)
export class TurmaPlatformGlobalController {
  constructor(private readonly turmas: TurmaService) {}

  @Get()
  async listar(@Query() filtros: ListarTurmasPlataformaDto) {
    if (filtros.empresa_id !== undefined)
      await this.turmas.assertEmpresa(filtros.empresa_id);
    const { empresa_id: empresaId, ...resto } = filtros;
    return this.turmas.listar(empresaId, resto, true);
  }
}
