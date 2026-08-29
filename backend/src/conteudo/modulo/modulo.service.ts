import { Injectable, Inject, NotFoundException } from '@nestjs/common';
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

  async findAll(usuario_id: number) {
    const modulos = await this.moduloRepository.find({
      where: { active: true },
      order: { order: 'ASC' },
    });

    const result = await Promise.all(
      modulos.map(async (modulo) => {
        const totalAulas = await this.aulaRepository.count({
          where: { modulo_id: modulo.id, active: true },
        });

        const completedAulas = await this.usuarioAulaRepository
          .createQueryBuilder('ua')
          .innerJoin('ua.aula', 'aula')
          .where('aula.modulo_id = :moduloId', { moduloId: modulo.id })
          .andWhere('ua.usuario_id = :usuarioId', { usuarioId: usuario_id })
          .andWhere('ua.completed = :completed', { completed: true })
          .getCount();

        const startedRows = await this.usuarioAulaRepository
          .createQueryBuilder('ua')
          .innerJoin('ua.aula', 'aula')
          .where('aula.modulo_id = :moduloId', { moduloId: modulo.id })
          .andWhere('ua.usuario_id = :usuarioId', { usuarioId: usuario_id })
          .getMany();

        const lastAccessedAt = startedRows.reduce<Date | null>(
          (latest, row) => {
            if (!row.last_accessed_at) return latest;
            return !latest || row.last_accessed_at > latest
              ? row.last_accessed_at
              : latest;
          },
          null,
        );

        const progress =
          totalAulas > 0 ? Math.round((completedAulas / totalAulas) * 100) : 0;

        return {
          ...modulo,
          totalAulas,
          completedAulas,
          progress,
          hasStarted: startedRows.length > 0,
          lastAccessedAt,
        };
      }),
    );

    return result;
  }

  async findOne(id: number, usuario_id: number) {
    const modulo = await this.moduloRepository.findOne({
      where: { id, active: true },
    });

    if (!modulo) {
      throw new NotFoundException('Módulo não encontrado');
    }

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
      };
    });

    const totalAulas = aulas.length;
    const completedCount = aulasWithStatus.filter(
      (a) => a.status === 'completed',
    ).length;
    const progress =
      totalAulas > 0 ? Math.round((completedCount / totalAulas) * 100) : 0;

    return {
      ...modulo,
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
