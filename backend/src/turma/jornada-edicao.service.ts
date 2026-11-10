import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager, In, MoreThan } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { AdminAuditService } from '../admin/admin-audit.service';
import { Modulo } from '../conteudo/modulo/modulo.entity';
import { Turma } from './entities/turma.entity';
import { TurmaProfessor } from './entities/turma-professor.entity';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaModulo } from './entities/turma-modulo.entity';
import { TurmaAulaAbertura } from './entities/turma-aula-abertura.entity';
import { TurmaAcessoService } from './turma-acesso.service';
import {
  aulasParaAbrirAgora,
  validarAgendamento,
  validarCancelamento,
} from './jornada-regras';
import {
  FiltrosPaginacao,
  TurmaResumo,
  listarAlunosDaTurma,
  listarTurmas,
} from './turma-consultas';
import {
  JornadaCarregada,
  JornadaEdicao,
  carregarJornada,
  montarEdicao,
  ordemDaJornada,
  segundos,
} from './jornada-edicao-leitura';

export type { JornadaEdicao } from './jornada-edicao-leitura';

export type DefinirAbertura =
  | { modo: 'agora' }
  | { modo: 'agendar'; abre_em: string };

export const EVENTO_JORNADA_ATUALIZADA = 'turma.jornada-atualizada';

type AulaAberta = { id: number; titulo: string };
type Edicao<T> = { resultado: T; aulasAbertas: AulaAberta[] };
type ComCascata = JornadaEdicao & { abertasEmCascata: number[] };

/** Professor (e admin/plataforma) monta a jornada da turma e decide quando cada aula abre. */
@Injectable()
export class JornadaEdicaoService {
  private readonly logger = new Logger(JornadaEdicaoService.name);

  constructor(
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
    private readonly acesso: TurmaAcessoService,
    private readonly audit: AdminAuditService,
    private readonly events: EventEmitter2,
  ) {}

  async minhas(atorId: number): Promise<TurmaResumo[]> {
    const ator = await this.acesso.carregarAtor(atorId);
    if (ator.role === Role.PLATFORM_ADMIN)
      throw new BadRequestException('Use as rotas da plataforma');
    if (!ator.empresa_id) return [];
    const base = {
      empresaId: ator.empresa_id,
      situacao: 'ativa' as const,
      pageSize: 100,
    };
    if (ator.role === Role.ADMIN)
      return (await listarTurmas(this.dataSource.manager, base)).items;
    if (ator.role !== Role.TEACHER)
      throw new ForbiddenException('Acesso indisponível');
    const vinculos = await this.dataSource
      .getRepository(TurmaProfessor)
      .find({ where: { usuario_id: ator.id } });
    const turmaIds = vinculos.map((vinculo) => vinculo.turma_id);
    return (await listarTurmas(this.dataSource.manager, { ...base, turmaIds }))
      .items;
  }

  async obter(atorId: number, turmaId: number): Promise<JornadaEdicao> {
    const ator = await this.acesso.carregarAtor(atorId);
    const turma = await this.acesso.assertPodeEditarJornada(ator, turmaId);
    return this.montar(this.dataSource.manager, turma);
  }

  async alunosDaTurma(
    atorId: number,
    turmaId: number,
    filtros: FiltrosPaginacao,
  ) {
    const ator = await this.acesso.carregarAtor(atorId);
    await this.acesso.assertPodeEditarJornada(ator, turmaId);
    return listarAlunosDaTurma(this.dataSource.manager, turmaId, filtros);
  }

  async salvarModulos(atorId: number, turmaId: number, moduloIds: number[]) {
    if (new Set(moduloIds).size !== moduloIds.length)
      throw new BadRequestException('Módulos repetidos');
    return this.editar(atorId, turmaId, async (manager, turma) => {
      const ativos = moduloIds.length
        ? await manager
            .getRepository(Modulo)
            .count({ where: { id: In(moduloIds), active: true } })
        : 0;
      if (ativos !== moduloIds.length)
        throw new BadRequestException('Selecione módulos ativos do catálogo');
      const vinculos = manager.getRepository(TurmaModulo);
      // Módulo desativado no catálogo some da jornada efetiva, mas mantém a linha da turma.
      const pausados = await vinculos
        .createQueryBuilder('tm')
        .innerJoin(Modulo, 'm', 'm.id = tm.modulo_id AND m.active = :ativo', {
          ativo: false,
        })
        .where('tm.turma_id = :turmaId', { turmaId: turma.id })
        .orderBy('tm.posicao', 'ASC')
        .getMany();
      const ordem = [...moduloIds, ...pausados.map((row) => row.modulo_id)];
      await vinculos.delete({ turma_id: turma.id });
      if (ordem.length)
        await vinculos.insert(
          ordem.map((moduloId, index) => ({
            turma_id: turma.id,
            modulo_id: moduloId,
            posicao: index + 1,
          })),
        );
      await this.registrar(manager, atorId, turma, 'turma.jornada_salva', {
        modulo_ids: moduloIds,
      });
      return { resultado: await this.montar(manager, turma), aulasAbertas: [] };
    });
  }

  async definirAbertura(
    atorId: number,
    turmaId: number,
    aulaId: number,
    dto: DefinirAbertura,
  ): Promise<ComCascata> {
    return this.editar(atorId, turmaId, async (manager, turma) => {
      const jornada = await carregarJornada(manager, turma.id);
      const agora = segundos(new Date());
      if (dto.modo === 'agora')
        return this.abrirAgora(
          manager,
          { atorId, turma, aulaId },
          jornada,
          agora,
        );
      return this.agendar(
        manager,
        { atorId, turma, aulaId },
        jornada,
        dto.abre_em,
      );
    });
  }

  async cancelarAbertura(atorId: number, turmaId: number, aulaId: number) {
    return this.editar(atorId, turmaId, async (manager, turma) => {
      const jornada = await carregarJornada(manager, turma.id);
      const agora = new Date();
      validarCancelamento(
        ordemDaJornada(jornada),
        aulaId,
        jornada.aberturas,
        agora,
      );
      const result = await manager.getRepository(TurmaAulaAbertura).delete({
        turma_id: turma.id,
        aula_id: aulaId,
        abre_em: MoreThan(agora),
      });
      if (!result.affected) throw new ConflictException('Esta aula já abriu');
      jornada.aberturas.delete(aulaId);
      await this.registrar(
        manager,
        atorId,
        turma,
        'turma.agendamento_cancelado',
        {
          aula_id: aulaId,
        },
      );
      return { resultado: montarEdicao(turma, jornada), aulasAbertas: [] };
    });
  }

  private async abrirAgora(
    manager: EntityManager,
    alvo: { atorId: number; turma: Turma; aulaId: number },
    jornada: JornadaCarregada,
    agora: Date,
  ): Promise<Edicao<ComCascata>> {
    const { atorId, turma, aulaId } = alvo;
    const ordem = ordemDaJornada(jornada);
    const ids = aulasParaAbrirAgora(ordem, aulaId, jornada.aberturas, agora);
    const repository = manager.getRepository(TurmaAulaAbertura);
    for (const id of ids) {
      // Agendadas no futuro são antecipadas; fechadas ganham a abertura agora.
      if (jornada.aberturas.has(id))
        await repository.update(
          { turma_id: turma.id, aula_id: id, abre_em: MoreThan(agora) },
          { abre_em: agora, definido_por_id: atorId },
        );
      else
        await repository.insert({
          turma_id: turma.id,
          aula_id: id,
          abre_em: agora,
          definido_por_id: atorId,
        });
      jornada.aberturas.set(id, agora);
    }
    await this.registrar(manager, atorId, turma, 'turma.aula_aberta', {
      aula_id: aulaId,
      cascata: ids,
    });
    const titulos = new Map(ordem.map((aula) => [aula.id, aula.titulo]));
    return {
      resultado: { ...montarEdicao(turma, jornada), abertasEmCascata: ids },
      aulasAbertas: ids.map((id) => ({ id, titulo: titulos.get(id) ?? '' })),
    };
  }

  private async agendar(
    manager: EntityManager,
    alvo: { atorId: number; turma: Turma; aulaId: number },
    jornada: JornadaCarregada,
    abreEmTexto: string,
  ): Promise<Edicao<ComCascata>> {
    const { atorId, turma, aulaId } = alvo;
    const agora = segundos(new Date());
    const abreEm = segundos(new Date(abreEmTexto));
    if (Number.isNaN(abreEm.getTime()))
      throw new BadRequestException('Data de abertura inválida');
    validarAgendamento(
      ordemDaJornada(jornada),
      aulaId,
      abreEm,
      jornada.aberturas,
      agora,
    );
    const repository = manager.getRepository(TurmaAulaAbertura);
    const existente = jornada.aberturas.has(aulaId);
    if (existente) {
      const result = await repository.update(
        { turma_id: turma.id, aula_id: aulaId, abre_em: MoreThan(agora) },
        { abre_em: abreEm, definido_por_id: atorId },
      );
      if (!result.affected) throw new ConflictException('Esta aula já abriu');
    } else {
      await repository.insert({
        turma_id: turma.id,
        aula_id: aulaId,
        abre_em: abreEm,
        definido_por_id: atorId,
      });
    }
    jornada.aberturas.set(aulaId, abreEm);
    await this.registrar(
      manager,
      atorId,
      turma,
      existente ? 'turma.agendamento_alterado' : 'turma.aula_agendada',
      { aula_id: aulaId, abre_em: abreEm.toISOString() },
    );
    return {
      resultado: { ...montarEdicao(turma, jornada), abertasEmCascata: [] },
      aulasAbertas: [],
    };
  }

  /** Escrita com a turma travada; aviso aos alunos só depois do commit. */
  private async editar<T>(
    atorId: number,
    turmaId: number,
    trabalho: (manager: EntityManager, turma: Turma) => Promise<Edicao<T>>,
  ): Promise<T> {
    const ator = await this.acesso.carregarAtor(atorId);
    const { turma, resultado, aulasAbertas } =
      await this.dataSource.transaction(async (manager) => {
        const turma = await this.acesso.assertPodeEditarJornada(ator, turmaId, {
          manager,
          lock: true,
        });
        if (!turma.ativa) throw new ConflictException('Turma arquivada');
        return { turma, ...(await trabalho(manager, turma)) };
      });
    await this.avisar(turma.id, aulasAbertas);
    return resultado;
  }

  /** Socket não participa da transação: falha aqui não desfaz a escrita já gravada. */
  private async avisar(turmaId: number, aulasAbertas: AulaAberta[]) {
    try {
      const alunos = await this.dataSource
        .getRepository(TurmaAluno)
        .find({ where: { turma_id: turmaId } });
      if (!alunos.length) return;
      this.events.emit(EVENTO_JORNADA_ATUALIZADA, {
        turmaId,
        usuarioIds: alunos.map((aluno) => aluno.usuario_id),
        aulasAbertas,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao avisar alunos da turma ${turmaId}`,
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  private registrar(
    manager: EntityManager,
    atorId: number,
    turma: Turma,
    acao: string,
    detalhes: Record<string, unknown>,
  ) {
    return this.audit.registrar(
      {
        empresaId: turma.empresa_id,
        atorId,
        acao,
        alvoTipo: 'turma',
        alvoId: turma.id,
        detalhes,
      },
      manager,
    );
  }

  private async montar(manager: EntityManager, turma: Turma) {
    return montarEdicao(turma, await carregarJornada(manager, turma.id));
  }
}
