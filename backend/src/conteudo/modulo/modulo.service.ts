import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Modulo } from './modulo.entity';
import { Aula } from '../aula/aula.entity';
import { UsuarioAula } from '../usuario-aula/usuario-aula.entity';
import { CreateModuloDto, UpdateModuloDto } from './dto/modulo.dto';

@Injectable()
export class ModuloService {
  constructor(
    @Inject('MODULO_REPOSITORY')
    private moduloRepository: Repository<Modulo>,

    @Inject('AULA_REPOSITORY')
    private aulaRepository: Repository<Aula>,

    @Inject('USUARIO_AULA_REPOSITORY')
    private usuarioAulaRepository: Repository<UsuarioAula>,
  ) {}

  /** Assets padronizados são resolvidos no frontend pelo título/chave do módulo. */
  private resolveThumbnail(source: string | null): string | null {
    const normalized = source?.trim();
    if (!normalized || normalized.startsWith('s3://')) return null;
    return normalized;
  }

  async findAll(usuario_id: number) {
    const [modulos, aulas, progressRows] = await Promise.all([
      this.moduloRepository.find({
        where: { active: true },
        order: { order: 'ASC', id: 'ASC' },
      }),
      this.aulaRepository.find({
        where: { active: true },
        order: { modulo_id: 'ASC', order: 'ASC', id: 'ASC' },
      }),
      this.usuarioAulaRepository
        .createQueryBuilder('ua')
        .innerJoinAndSelect('ua.aula', 'aula', 'aula.active = :active', {
          active: true,
        })
        .where('ua.usuario_id = :usuarioId', { usuarioId: usuario_id })
        .getMany(),
    ]);

    const aulasByModulo = new Map<number, Aula[]>();
    for (const aula of aulas) {
      const grouped = aulasByModulo.get(aula.modulo_id) ?? [];
      grouped.push(aula);
      aulasByModulo.set(aula.modulo_id, grouped);
    }
    const progressByAula = new Map(
      progressRows.map((row) => [row.aula_id, row]),
    );

    // Bloqueio sequencial de modulo: o proximo modulo (pela ordem) so libera
    // quando o modulo anterior estiver 100% concluido. O primeiro sempre libera.
    let previousModuloCompleted = true;

    return modulos.map((modulo) => {
      const moduloAulas = aulasByModulo.get(modulo.id) ?? [];
      const moduloProgress = moduloAulas
        .map((aula) => progressByAula.get(aula.id))
        .filter((row): row is UsuarioAula => Boolean(row));
      const completedAulas = moduloAulas.filter(
        (aula) => progressByAula.get(aula.id)?.completed,
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
        (aula) => !progressByAula.get(aula.id)?.completed,
      );
      const thumbnail = this.resolveThumbnail(modulo.thumbnail);

      const locked = !previousModuloCompleted;
      // um modulo sem aulas ativas nao trava a cadeia
      const isModuloCompleted = totalAulas === 0 || progress === 100;
      previousModuloCompleted = previousModuloCompleted && isModuloCompleted;

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
        locked,
      };
    });
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
  ): Promise<void> {
    const modulos = await this.findAll(usuario_id);
    const alvo = modulos.find((modulo) => modulo.id === modulo_id);
    if (alvo?.locked) {
      throw new ForbiddenException(
        'Módulo bloqueado. Conclua o módulo anterior para liberá-lo.',
      );
    }
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

    await this.assertModuloDesbloqueado(id, usuario_id);

    const aulas = await this.aulaRepository.find({
      where: { modulo_id: id, active: true },
      order: { order: 'ASC' },
    });

    const userProgress = await this.usuarioAulaRepository.find({
      where: { usuario_id },
    });
    const progressByAula = new Map(
      userProgress.map((row) => [row.aula_id, row]),
    );
    const completedAulaIds = userProgress
      .filter((row) => row.completed)
      .map((row) => row.aula_id);

    const aulasWithStatus = aulas.map((aula, index) => {
      const isCompleted = completedAulaIds.includes(aula.id);
      const previousCompleted =
        index === 0 || completedAulaIds.includes(aulas[index - 1].id);
      const isUnlocked = index === 0 || previousCompleted;
      const progress = progressByAula.get(aula.id);

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
        status: isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked',
        progress_percent: progress?.progress_percent ?? 0,
        last_video_second: progress?.last_video_second ?? 0,
        last_page: progress?.last_page ?? 0,
        last_accessed_at: progress?.last_accessed_at ?? null,
        artworkKey: null,
      };
    });

    const totalAulas = aulas.length;
    const completedCount = aulasWithStatus.filter(
      (a) => a.status === 'completed',
    ).length;
    const progress =
      totalAulas > 0 ? Math.round((completedCount / totalAulas) * 100) : 0;
    const thumbnail = this.resolveThumbnail(modulo.thumbnail);

    return {
      ...modulo,
      thumbnail,
      artworkUrl: thumbnail,
      aulas: aulasWithStatus,
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
