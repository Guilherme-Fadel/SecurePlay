import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { AdminAuditService } from '../admin/admin-audit.service';
import { Empresa } from '../empresa/empresa.entity';
import { Usuario } from '../usuario/usuario.entity';
import { Modulo } from '../conteudo/modulo/modulo.entity';
import { Turma } from './entities/turma.entity';
import { TurmaProfessor } from './entities/turma-professor.entity';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaModulo } from './entities/turma-modulo.entity';
import { TURMA_NAO_ENCONTRADA } from './turma-acesso.service';
import { duplicado, nomeValido } from './turma-validacao';
import {
  revogarConvitesDaTurma,
  vincularAlunosNaTurma,
} from './turma-vinculos';
import {
  AlunoDaTurma,
  FiltrosPaginacao,
  FiltrosTurmas,
  Paginado,
  TurmaResumo,
  listarAlunosDaTurma,
  listarProfessoresDaTurma,
  listarTurmas,
  resumirTurmas,
} from './turma-consultas';

const TURMA_ARQUIVADA = 'Turma arquivada';
const NOME_DUPLICADO = 'Já existe uma turma com este nome neste ano';

type DadosTurma = { nome: string; ano_letivo: number };
type Evento = { acao: string; detalhes?: Record<string, unknown> };

/** Gestão de turmas. `empresaId` já foi resolvido pelo controller (escola do admin ou rota da plataforma). */
@Injectable()
export class TurmaService {
  constructor(
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
    private readonly audit: AdminAuditService,
  ) {}

  async assertEmpresa(empresaId: number): Promise<void> {
    const existe = await this.dataSource
      .getRepository(Empresa)
      .exists({ where: { id: empresaId } });
    if (!existe) throw new NotFoundException('Empresa não encontrada');
  }

  private async turmaDaEmpresa(
    manager: EntityManager,
    empresaId: number,
    turmaId: number,
    lock = false,
  ): Promise<Turma> {
    const turma = await manager.getRepository(Turma).findOne({
      where: { id: turmaId, empresa_id: empresaId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!turma) throw new NotFoundException(TURMA_NAO_ENCONTRADA);
    return turma;
  }

  private exigirAtiva(turma: Turma): void {
    if (!turma.ativa) throw new ConflictException(TURMA_ARQUIVADA);
  }

  private registrar(
    manager: EntityManager,
    atorId: number,
    turma: Turma,
    evento: Evento,
  ) {
    return this.audit.registrar(
      {
        empresaId: turma.empresa_id,
        atorId,
        acao: evento.acao,
        alvoTipo: 'turma',
        alvoId: turma.id,
        detalhes: evento.detalhes ?? null,
      },
      manager,
    );
  }

  /** Transação com a turma travada; toda escrita de gestão passa por aqui. */
  private comTurma<T>(
    empresaId: number,
    turmaId: number,
    trabalho: (manager: EntityManager, turma: Turma) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) =>
      trabalho(
        manager,
        await this.turmaDaEmpresa(manager, empresaId, turmaId, true),
      ),
    );
  }

  private async resumo(manager: EntityManager, turma: Turma) {
    return (await resumirTurmas(manager, [turma]))[0];
  }

  listar(
    empresaId: number,
    filtros: FiltrosTurmas,
  ): Promise<Paginado<TurmaResumo>> {
    return listarTurmas(this.dataSource.manager, { ...filtros, empresaId });
  }

  async criar(
    atorId: number,
    empresaId: number,
    dto: DadosTurma,
  ): Promise<TurmaResumo> {
    const nome = nomeValido(dto.nome);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(Turma);
        const turma = await repository.save(
          repository.create({
            empresa_id: empresaId,
            nome,
            ano_letivo: dto.ano_letivo,
            ativa: true,
          }),
        );
        const catalogo = await manager.getRepository(Modulo).find({
          where: { active: true },
          order: { order: 'ASC', id: 'ASC' },
          select: { id: true },
        });
        if (catalogo.length)
          await manager.getRepository(TurmaModulo).insert(
            catalogo.map((modulo, index) => ({
              turma_id: turma.id,
              modulo_id: modulo.id,
              posicao: index + 1,
            })),
          );
        await this.registrar(manager, atorId, turma, {
          acao: 'turma.criada',
          detalhes: {
            nome,
            ano_letivo: dto.ano_letivo,
            modulos: catalogo.length,
          },
        });
        return this.resumo(manager, turma);
      });
    } catch (error) {
      if (duplicado(error)) throw new ConflictException(NOME_DUPLICADO);
      throw error;
    }
  }

  async atualizar(
    atorId: number,
    empresaId: number,
    turmaId: number,
    dto: DadosTurma,
  ): Promise<TurmaResumo> {
    const nome = nomeValido(dto.nome);
    try {
      return await this.comTurma(empresaId, turmaId, async (manager, turma) => {
        this.exigirAtiva(turma);
        turma.nome = nome;
        turma.ano_letivo = dto.ano_letivo;
        await manager.getRepository(Turma).save(turma);
        await this.registrar(manager, atorId, turma, {
          acao: 'turma.atualizada',
          detalhes: { nome, ano_letivo: dto.ano_letivo },
        });
        return this.resumo(manager, turma);
      });
    } catch (error) {
      if (duplicado(error)) throw new ConflictException(NOME_DUPLICADO);
      throw error;
    }
  }

  arquivar(atorId: number, empresaId: number, turmaId: number) {
    return this.comTurma(empresaId, turmaId, async (manager, turma) => {
      if (turma.ativa) {
        turma.ativa = false;
        await manager.getRepository(Turma).save(turma);
        const convites = await revogarConvitesDaTurma(manager, turma.id);
        await this.registrar(manager, atorId, turma, {
          acao: 'turma.arquivada',
          detalhes: { convites_revogados: convites },
        });
      }
      return this.resumo(manager, turma);
    });
  }

  reativar(atorId: number, empresaId: number, turmaId: number) {
    return this.comTurma(empresaId, turmaId, async (manager, turma) => {
      if (!turma.ativa) {
        turma.ativa = true;
        await manager.getRepository(Turma).save(turma);
        await this.registrar(manager, atorId, turma, {
          acao: 'turma.reativada',
        });
      }
      return this.resumo(manager, turma);
    });
  }

  async listarProfessores(empresaId: number, turmaId: number) {
    await this.turmaDaEmpresa(this.dataSource.manager, empresaId, turmaId);
    return listarProfessoresDaTurma(this.dataSource.manager, turmaId);
  }

  async vincularProfessor(
    atorId: number,
    empresaId: number,
    turmaId: number,
    usuarioId: number,
  ): Promise<void> {
    await this.comTurma(empresaId, turmaId, async (manager, turma) => {
      this.exigirAtiva(turma);
      const professor = await manager.getRepository(Usuario).findOne({
        where: {
          id: usuarioId,
          empresa_id: empresaId,
          role: Role.TEACHER,
          active: true,
        },
      });
      if (!professor)
        throw new BadRequestException(
          'Selecione um professor ativo desta escola',
        );
      const vinculos = manager.getRepository(TurmaProfessor);
      if (
        await vinculos.exists({
          where: { turma_id: turma.id, usuario_id: usuarioId },
        })
      )
        return;
      await vinculos.insert({ turma_id: turma.id, usuario_id: usuarioId });
      await this.registrar(manager, atorId, turma, {
        acao: 'turma.professor_vinculado',
        detalhes: { usuario_id: usuarioId },
      });
    });
  }

  async desvincularProfessor(
    atorId: number,
    empresaId: number,
    turmaId: number,
    usuarioId: number,
  ): Promise<void> {
    await this.comTurma(empresaId, turmaId, async (manager, turma) => {
      this.exigirAtiva(turma);
      const result = await manager
        .getRepository(TurmaProfessor)
        .delete({ turma_id: turma.id, usuario_id: usuarioId });
      if (!result.affected)
        throw new NotFoundException('Professor não vinculado a esta turma');
      await this.registrar(manager, atorId, turma, {
        acao: 'turma.professor_desvinculado',
        detalhes: { usuario_id: usuarioId },
      });
    });
  }

  async listarAlunos(
    empresaId: number,
    turmaId: number,
    filtros: FiltrosPaginacao,
  ): Promise<Paginado<AlunoDaTurma>> {
    await this.turmaDaEmpresa(this.dataSource.manager, empresaId, turmaId);
    return listarAlunosDaTurma(this.dataSource.manager, turmaId, filtros);
  }

  adicionarAlunos(
    atorId: number,
    empresaId: number,
    turmaId: number,
    usuarioIds: number[],
  ): Promise<{ adicionados: number; movidos: number }> {
    const ids = [...new Set(usuarioIds)];
    return this.comTurma(empresaId, turmaId, async (manager, turma) => {
      this.exigirAtiva(turma);
      const alunos = await manager.getRepository(Usuario).count({
        where: { id: In(ids), empresa_id: empresaId, role: Role.USER },
      });
      if (!ids.length || alunos !== ids.length)
        throw new BadRequestException('Selecione apenas alunos desta escola');
      const { adicionados, movidos } = await vincularAlunosNaTurma(
        manager,
        turma,
        ids,
      );
      if (adicionados.length)
        await this.registrar(manager, atorId, turma, {
          acao: 'turma.aluno_adicionado',
          detalhes: { usuario_ids: adicionados },
        });
      if (movidos.length)
        await this.registrar(manager, atorId, turma, {
          acao: 'turma.aluno_movido',
          detalhes: { movidos },
        });
      return { adicionados: adicionados.length, movidos: movidos.length };
    });
  }

  /** Permitido também em turma arquivada: o aluno volta à jornada global. */
  async removerAluno(
    atorId: number,
    empresaId: number,
    turmaId: number,
    usuarioId: number,
  ): Promise<void> {
    await this.comTurma(empresaId, turmaId, async (manager, turma) => {
      const result = await manager
        .getRepository(TurmaAluno)
        .delete({ usuario_id: usuarioId, turma_id: turma.id });
      if (!result.affected)
        throw new NotFoundException('Aluno não está nesta turma');
      await this.registrar(manager, atorId, turma, {
        acao: 'turma.aluno_removido',
        detalhes: { usuario_id: usuarioId },
      });
    });
  }
}
