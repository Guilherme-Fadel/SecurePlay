import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { TurmaAcessoService } from './turma-acesso.service';
import { SalvarTurmaDto } from './dto/salvar-turma.dto';
import { ListarTurmasDto, PaginacaoDto } from './dto/listar-turmas.dto';
import { VincularProfessorDto } from './dto/vincular-professor.dto';
import { AdicionarAlunosDto } from './dto/adicionar-alunos.dto';

type AdminRequest = { user: { userId: number } };

/** Turmas da escola do administrador; a empresa vem do banco, nunca do corpo ou da URL. */
@Controller('admin/empresa/turmas')
@Roles(Role.ADMIN)
export class TurmaAdminController {
  constructor(
    private readonly turmas: TurmaService,
    private readonly acesso: TurmaAcessoService,
  ) {}

  private async escola(req: AdminRequest) {
    const ator = await this.acesso.carregarAtor(req.user.userId);
    if (ator.role !== Role.ADMIN || !ator.empresa_id)
      throw new ForbiddenException('Empresa inválida');
    return { atorId: ator.id, empresaId: ator.empresa_id };
  }

  @Get()
  async listar(
    @Request() req: AdminRequest,
    @Query() filtros: ListarTurmasDto,
  ) {
    const { empresaId } = await this.escola(req);
    return this.turmas.listar(empresaId, filtros);
  }

  @Post()
  async criar(@Request() req: AdminRequest, @Body() dto: SalvarTurmaDto) {
    const { atorId, empresaId } = await this.escola(req);
    return this.turmas.criar(atorId, empresaId, dto);
  }

  @Put(':turmaId')
  async atualizar(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Body() dto: SalvarTurmaDto,
  ) {
    const { atorId, empresaId } = await this.escola(req);
    return this.turmas.atualizar(atorId, empresaId, turmaId, dto);
  }

  @Post(':turmaId/arquivar')
  async arquivar(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
  ) {
    const { atorId, empresaId } = await this.escola(req);
    return this.turmas.arquivar(atorId, empresaId, turmaId);
  }

  @Post(':turmaId/reativar')
  async reativar(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
  ) {
    const { atorId, empresaId } = await this.escola(req);
    return this.turmas.reativar(atorId, empresaId, turmaId);
  }

  @Get(':turmaId/professores')
  async professores(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
  ) {
    const { empresaId } = await this.escola(req);
    return this.turmas.listarProfessores(empresaId, turmaId);
  }

  @Post(':turmaId/professores')
  async vincularProfessor(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Body() dto: VincularProfessorDto,
  ) {
    const { atorId, empresaId } = await this.escola(req);
    await this.turmas.vincularProfessor(
      atorId,
      empresaId,
      turmaId,
      dto.usuario_id,
    );
    return { sucesso: true };
  }

  @Delete(':turmaId/professores/:usuarioId')
  async desvincularProfessor(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    const { atorId, empresaId } = await this.escola(req);
    await this.turmas.desvincularProfessor(
      atorId,
      empresaId,
      turmaId,
      usuarioId,
    );
    return { sucesso: true };
  }

  @Get(':turmaId/alunos')
  async alunos(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Query() filtros: PaginacaoDto,
  ) {
    const { empresaId } = await this.escola(req);
    return this.turmas.listarAlunos(empresaId, turmaId, filtros);
  }

  @Post(':turmaId/alunos')
  async adicionarAlunos(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Body() dto: AdicionarAlunosDto,
  ) {
    const { atorId, empresaId } = await this.escola(req);
    return this.turmas.adicionarAlunos(
      atorId,
      empresaId,
      turmaId,
      dto.usuario_ids,
    );
  }

  @Delete(':turmaId/alunos/:usuarioId')
  async removerAluno(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    const { atorId, empresaId } = await this.escola(req);
    await this.turmas.removerAluno(atorId, empresaId, turmaId, usuarioId);
    return { sucesso: true };
  }
}
