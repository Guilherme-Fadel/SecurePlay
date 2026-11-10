import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Modulo } from './modulo.entity';
import { Aula } from '../aula/aula.entity';
import { UsuarioAula } from '../usuario-aula/usuario-aula.entity';
import { CreateModuloDto, UpdateModuloDto } from './dto/modulo.dto';
import { sortAulasByModuleSequence } from '../aula/aula-order';
import {
  JornadaDaTurma,
  JornadaTurmaService,
} from '../../turma/jornada-turma.service';
import {
  EstadoAula,
  LockReason,
  ModuloRef,
  resolverEstadoJornada,
} from '../../turma/jornada-regras';
import { mensagemDeBloqueio } from '../../turma/jornada-mensagens';

const MODULO_BLOQUEADO =
  'Módulo bloqueado. Conclua o módulo anterior para liberá-lo.';

interface Carga {
  modulos: Modulo[];
  aulasByModulo: Map<number, Aula[]>;
  progressByAula: Map<number, UsuarioAula>;
  jornada: JornadaDaTurma | null;
}

@Injectable()
export class ModuloService {
  constructor(
    @Inject('MODULO_REPOSITORY')
    private moduloRepository: Repository<Modulo>,

    @Inject('AULA_REPOSITORY')
    private aulaRepository: Repository<Aula>,

    @Inject('USUARIO_AULA_REPOSITORY')
    private usuarioAulaRepository: Repository<UsuarioAula>,

    private jornadaTurma: JornadaTurmaService,
  ) {}

  /** Assets padronizados são resolvidos no frontend pelo título/chave do módulo. */
  private resolveThumbnail(source: string | null): string | null {
    const normalized = source?.trim();
    if (!normalized || normalized.startsWith('s3://')) return null;
    return normalized;
  }

  private async carregar(
    usuario_id: number,
    manager?: EntityManager,
    jornadaPronta?: JornadaDaTurma | null,
  ): Promise<Carga> {
    const moduloRepository =
      manager?.getRepository(Modulo) ?? this.moduloRepository;
    const aulaRepository = manager?.getRepository(Aula) ?? this.aulaRepository;
    const usuarioAulaRepository =
      manager?.getRepository(UsuarioAula) ?? this.usuarioAulaRepository;
    const [modulos, aulas, progressRows, jornada] = await Promise.all([
      moduloRepository.find({
        where: { active: true },
        order: { order: 'ASC', id: 'ASC' },
      }),
      aulaRepository.find({
        where: { active: true },
        order: { modulo_id: 'ASC', order: 'ASC', id: 'ASC' },
      }),
      usuarioAulaRepository
        .createQueryBuilder('ua')
        .innerJoinAndSelect('ua.aula', 'aula', 'aula.active = :active', {
          active: true,
        })
        .where('ua.usuario_id = :usuarioId', { usuarioId: usuario_id })
        .getMany(),
      jornadaPronta !== undefined
        ? Promise.resolve(jornadaPronta)
        : this.jornadaTurma.jornadaDoAluno(usuario_id, manager),
    ]);

    const aulasByModulo = new Map<number, Aula[]>();
    for (const aula of aulas) {
      const grouped = aulasByModulo.get(aula.modulo_id) ?? [];
      grouped.push(aula);
      aulasByModulo.set(aula.modulo_id, grouped);
    }
    for (const [moduloId, moduloAulas] of aulasByModulo) {
      aulasByModulo.set(moduloId, sortAulasByModuleSequence(moduloAulas));
    }
    return {
      modulos,
      aulasByModulo,
      progressByAula: new Map(progressRows.map((row) => [row.aula_id, row])),
      jornada,
    };
  }

  private resumir(
    modulo: Modulo,
    carga: Carga,
    locked: boolean,
    outsideJourney: boolean,
    estados: Map<number, EstadoAula> | null,
  ) {
    const moduloAulas = carga.aulasByModulo.get(modulo.id) ?? [];
    const moduloProgress = moduloAulas
      .map((aula) => carga.progressByAula.get(aula.id))
      .filter((row): row is UsuarioAula => Boolean(row));
    const completedAulas = moduloAulas.filter(
      (aula) => carga.progressByAula.get(aula.id)?.completed,
    ).length;
    const lastAccessedAt = moduloProgress.reduce<Date | null>(
      (latest, row) => {
        if (!row.last_accessed_at) return latest;
        return !latest || row.last_accessed_at > latest
          ? row.last_accessed_at
          : latest;
      },
      null,
    );
    const totalAulas = moduloAulas.length;
    const progress =
      totalAulas > 0 ? Math.round((completedAulas / totalAulas) * 100) : 0;
    const nextAula = moduloAulas.find(
      (aula) => !carga.progressByAula.get(aula.id)?.completed,
    );
    const thumbnail = this.resolveThumbnail(modulo.thumbnail);
    const estadoNext = nextAula ? estados?.get(nextAula.id) : undefined;
    const nextLockReason: LockReason | null = estados
      ? (estadoNext?.lockReason ?? null)
      : locked
        ? 'sequence'
        : null;

    return {
      ...modulo,
      thumbnail,
      artworkUrl: thumbnail,
      totalAulas,
      completedAulas,
      progress,
      hasStarted: moduloProgress.length > 0,
      lastAccessedAt,
      nextAulaId: nextAula?.id ?? null,
      // B1: detalhe da proxima aula para o "Continue de onde parou" sem request extra.
      nextAula: nextAula
        ? {
            id: nextAula.id,
            title: nextAula.title,
            type: nextAula.type,
            xp: nextAula.xp,
            duration: nextAula.duration,
            section_name: nextAula.section_name ?? null,
            position: moduloAulas.indexOf(nextAula) + 1,
            lock_reason: nextLockReason,
            opens_at: estadoNext?.opensAt?.toISOString() ?? null,
          }
        : null,
      locked,
      outside_journey: outsideJourney,
      lastCompletedAulaId: this.ultimaConcluida(moduloAulas, carga),
    };
  }

  /** Aula concluída mais recente do módulo, para "Revisar a última aula". */
  private ultimaConcluida(moduloAulas: Aula[], carga: Carga): number | null {
    let escolhida: { id: number; quando: number } | null = null;
    moduloAulas.forEach((aula, index) => {
      const row = carga.progressByAula.get(aula.id);
      if (!row?.completed) return;
      // Sem data, vale a posição na sequência (concluídas antigas sem completed_at).
      const quando = row.completed_at
        ? new Date(row.completed_at).getTime()
        : index - moduloAulas.length;
      if (!escolhida || quando >= escolhida.quando)
        escolhida = { id: aula.id, quando };
    });
    return (escolhida as { id: number } | null)?.id ?? null;
  }

  private listar(carga: Carga) {
    if (!carga.jornada) {
      // Cada trilha progride separadamente; a trilha principal preserva a ordem legada.
      const completedByPath = new Map<string, boolean>();
      const modulos = carga.modulos.map((modulo) => {
        const moduloAulas = carga.aulasByModulo.get(modulo.id) ?? [];
        const hasStarted = moduloAulas.some((aula) =>
          carga.progressByAula.has(aula.id),
        );
        const completedAulas = moduloAulas.filter(
          (aula) => carga.progressByAula.get(aula.id)?.completed,
        ).length;
        const path = modulo.learning_path || 'principal';
        const previousModuloCompleted = completedByPath.get(path) ?? true;
        // O que o aluno já começou nunca volta a bloquear (ex.: saiu de uma turma).
        const locked = !previousModuloCompleted && !hasStarted;
        // um modulo sem aulas ativas nao trava a cadeia
        const isModuloCompleted =
          moduloAulas.length === 0 || completedAulas === moduloAulas.length;
        completedByPath.set(path, previousModuloCompleted && isModuloCompleted);
        return this.resumir(modulo, carga, locked, false, null);
      });
      return { modulos, estados: null };
    }

    const ativos = new Map(carga.modulos.map((modulo) => [modulo.id, modulo]));
    const naJornada = carga.jornada.moduloIds.filter((id) => ativos.has(id));
    const idsNaJornada = new Set(naJornada);
    const ref = (modulo: Modulo): ModuloRef => ({
      id: modulo.id,
      aulas: (carga.aulasByModulo.get(modulo.id) ?? []).map((aula) => ({
        id: aula.id,
        modulo_id: aula.modulo_id,
        titulo: aula.title,
      })),
    });
    const foraDaJornada = carga.modulos.filter(
      (modulo) =>
        !idsNaJornada.has(modulo.id) &&
        (carga.aulasByModulo.get(modulo.id) ?? []).some((aula) =>
          carga.progressByAula.has(aula.id),
        ),
    );
    const estadosModulos = resolverEstadoJornada({
      modulos: naJornada.map((id) => ref(ativos.get(id)!)),
      foraDaJornada: foraDaJornada.map(ref),
      aberturas: carga.jornada.aberturas,
      progresso: new Map(
        [...carga.progressByAula].map(([aulaId, row]) => [
          aulaId,
          { completed: !!row.completed },
        ]),
      ),
      agora: new Date(),
    });
    const estados = new Map(
      estadosModulos.flatMap((modulo) =>
        modulo.aulas.map((aula) => [aula.aulaId, aula] as const),
      ),
    );
    const modulos = estadosModulos.map((estado) =>
      this.resumir(
        ativos.get(estado.moduloId)!,
        carga,
        estado.locked,
        estado.outsideJourney,
        estados,
      ),
    );
    return { modulos, estados };
  }

  async findAll(usuario_id: number, manager?: EntityManager) {
    return this.listar(await this.carregar(usuario_id, manager)).modulos;
  }

  /**
   * Verifica se o modulo esta liberado para o usuario.
   * Regra: o primeiro modulo (menor order) sempre libera; os demais so
   * liberam quando o modulo imediatamente anterior estiver 100% concluido.
   * Modulos anteriores sem aulas ativas nao travam a cadeia.
   * Lanca ForbiddenException quando o modulo esta bloqueado.
   */
  async assertModuloDesbloqueado(
    modulo_id: number,
    usuario_id: number,
    manager?: EntityManager,
  ): Promise<void> {
    const modulos = await this.findAll(usuario_id, manager);
    const alvo = modulos.find((modulo) => modulo.id === modulo_id);
    if (!alvo) {
      throw new NotFoundException('Módulo não encontrado');
    }
    if (alvo?.locked) {
      throw new ForbiddenException(MODULO_BLOQUEADO);
    }
  }

  /**
   * Regra da turma para abrir, salvar progresso, concluir ou responder uma aula.
   * Devolve `false` para aluno sem turma: a regra sequencial legada decide.
   */
  async assertAulaDaTurma(
    aula: Pick<Aula, 'id' | 'modulo_id'>,
    usuario_id: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    const jornada = await this.jornadaTurma.jornadaDoAluno(usuario_id, manager);
    if (!jornada) return false;
    const { modulos, estados } = this.listar(
      await this.carregar(usuario_id, manager, jornada),
    );
    const modulo = modulos.find((item) => item.id === aula.modulo_id);
    if (!modulo) throw new NotFoundException('Módulo não encontrado');
    if (modulo.locked) throw new ForbiddenException(MODULO_BLOQUEADO);
    const estado = estados?.get(aula.id);
    if (!estado)
      throw new BadRequestException(mensagemDeBloqueio('outside_journey', null));
    if (estado.status === 'locked')
      throw new BadRequestException(
        mensagemDeBloqueio(estado.lockReason ?? 'sequence', estado.opensAt),
      );
    return true;
  }

  async getJourneySummary(usuario_id: number) {
    const modules = await this.findAll(usuario_id);
    const incomplete = modules.filter(
      (modulo) => modulo.progress < 100 && !modulo.locked,
    );
    const current =
      [...incomplete]
        .filter((modulo) => modulo.hasStarted)
        .sort((a, b) => {
          const dateDifference =
            (Date.parse(String(b.lastAccessedAt ?? '')) || 0) -
            (Date.parse(String(a.lastAccessedAt ?? '')) || 0);
          return dateDifference || a.order - b.order || a.id - b.id;
        })[0] ??
      incomplete[0] ??
      modules.at(-1) ??
      null;

    const stageNames: Record<string, string> = {
      iniciante: 'Bosque dos Fundamentos',
      intermediario: 'Vale dos Guardiões',
      avancado: 'Cidadela Digital',
    };
    const stageThemes: Record<string, string> = {
      iniciante: 'meadow',
      intermediario: 'valley',
      avancado: 'citadel',
    };
    const stages = new Map<
      string,
      {
        key: string;
        title: string;
        order: number;
        theme: string;
        artworkUrl: string | null;
        nodes: Array<Record<string, unknown>>;
      }
    >();

    modules.forEach((modulo, globalIndex) => {
      const key = String(modulo.difficulty || 'jornada');
      if (!stages.has(key)) {
        stages.set(key, {
          key,
          title: stageNames[key] ?? modulo.category ?? 'Nova etapa',
          order: stages.size,
          theme: stageThemes[key] ?? 'default',
          artworkUrl: null,
          nodes: [],
        });
      }
      stages.get(key)!.nodes.push({
        id: modulo.id,
        order: modulo.order,
        globalPosition: globalIndex + 1,
        title: modulo.title,
        progress: modulo.progress,
        totalAulas: modulo.totalAulas,
        completedAulas: modulo.completedAulas,
        hasStarted: modulo.hasStarted,
        lastAccessedAt: modulo.lastAccessedAt,
        artworkUrl: modulo.artworkUrl,
        nextAulaId: modulo.nextAulaId,
        xpTotal: modulo.xp_total,
        xpBonus: modulo.xp_bonus,
        locked: modulo.locked,
        availability: modulo.locked ? 'locked' : 'available',
        outsideJourney: modulo.outside_journey ?? false,
        nextLessonLockReason: modulo.nextAula?.lock_reason ?? null,
        nextLessonOpensAt: modulo.nextAula?.opens_at ?? null,
        lastCompletedAulaId: modulo.lastCompletedAulaId ?? null,
      });
    });

    const totalLessons = modules.reduce(
      (sum, modulo) => sum + modulo.totalAulas,
      0,
    );
    const completedLessons = modules.reduce(
      (sum, modulo) => sum + modulo.completedAulas,
      0,
    );

    return {
      summary: {
        totalModules: modules.length,
        completedModules: modules.filter((modulo) => modulo.progress === 100)
          .length,
        totalLessons,
        completedLessons,
        progressPercent:
          totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
      },
      currentModuleId: current?.id ?? null,
      stages: Array.from(stages.values()),
    };
  }

  async findOne(id: number, usuario_id: number) {
    const modulo = await this.moduloRepository.findOne({
      where: { id, active: true },
    });

    if (!modulo) {
      throw new NotFoundException('Módulo não encontrado');
    }

    const jornada = await this.jornadaTurma.jornadaDoAluno(usuario_id);
    if (jornada) return this.findOneDaTurma(modulo, usuario_id, jornada);

    await this.assertModuloDesbloqueado(id, usuario_id);

    const aulas = sortAulasByModuleSequence(
      await this.aulaRepository.find({
        where: { modulo_id: id, active: true },
        order: { order: 'ASC', id: 'ASC' },
      }),
    );

    const userProgress = await this.usuarioAulaRepository.find({
      where: { usuario_id },
    });
    const progressByAula = new Map(
      userProgress.map((row) => [row.aula_id, row]),
    );
    const completedAulaIds = userProgress
      .filter((row) => row.completed)
      .map((row) => row.aula_id);

    const firstIncompleteIndex = aulas.findIndex(
      (aula) => !completedAulaIds.includes(aula.id),
    );
    const aulasWithStatus = aulas.map((aula, index) => {
      const isCompleted = completedAulaIds.includes(aula.id);
      const isUnlocked = index === firstIncompleteIndex;
      const progress = progressByAula.get(aula.id);

      return {
        ...this.aulaResumo(aula, progress),
        status: isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked',
        lock_reason: isCompleted || isUnlocked ? null : ('sequence' as const),
        opens_at: null,
      };
    });

    return this.detalhe(modulo, aulasWithStatus);
  }

  private async findOneDaTurma(
    modulo: Modulo,
    usuario_id: number,
    jornada: JornadaDaTurma,
  ) {
    const carga = await this.carregar(usuario_id, undefined, jornada);
    const { modulos, estados } = this.listar(carga);
    const alvo = modulos.find((item) => item.id === modulo.id);
    if (!alvo) throw new NotFoundException('Módulo não encontrado');
    if (alvo.locked) throw new ForbiddenException(MODULO_BLOQUEADO);
    const aulas = (carga.aulasByModulo.get(modulo.id) ?? []).map((aula) => {
      const estado = estados?.get(aula.id);
      return {
        ...this.aulaResumo(aula, carga.progressByAula.get(aula.id)),
        status: estado?.status ?? 'locked',
        lock_reason: estado ? estado.lockReason : 'outside_journey',
        opens_at: estado?.opensAt?.toISOString() ?? null,
      };
    });
    return this.detalhe(modulo, aulas);
  }

  private aulaResumo(aula: Aula, progress: UsuarioAula | undefined) {
    return {
      id: aula.id,
      title: aula.title,
      description: aula.description,
      type: aula.type,
      duration: aula.duration,
      xp: aula.xp,
      order: aula.order,
      section_name: aula.section_name,
      page_count: aula.pages?.length ?? 0,
      progress_percent: progress?.progress_percent ?? 0,
      last_video_second: progress?.last_video_second ?? 0,
      last_page: progress?.last_page ?? 0,
      last_accessed_at: progress?.last_accessed_at ?? null,
      artworkKey: null,
    };
  }

  private detalhe<T extends { status: string }>(modulo: Modulo, aulas: T[]) {
    const totalAulas = aulas.length;
    const completedCount = aulas.filter((a) => a.status === 'completed').length;
    const progress =
      totalAulas > 0 ? Math.round((completedCount / totalAulas) * 100) : 0;
    const thumbnail = this.resolveThumbnail(modulo.thumbnail);

    return {
      ...modulo,
      thumbnail,
      artworkUrl: thumbnail,
      aulas,
      totalAulas,
      completedAulas: completedCount,
      progress,
    };
  }

  async create(dto: CreateModuloDto): Promise<Modulo> {
    const modulo = this.moduloRepository.create(dto);
    return this.moduloRepository.save(modulo);
  }

  async update(id: number, dto: UpdateModuloDto): Promise<Modulo> {
    const modulo = await this.moduloRepository.findOne({ where: { id } });

    if (!modulo) {
      throw new NotFoundException('Módulo não encontrado');
    }

    Object.assign(modulo, dto);
    return this.moduloRepository.save(modulo);
  }

  async delete(id: number): Promise<void> {
    const modulo = await this.moduloRepository.findOne({ where: { id } });

    if (!modulo) {
      throw new NotFoundException('Módulo não encontrado');
    }

    await this.moduloRepository.delete(id);
  }
}
