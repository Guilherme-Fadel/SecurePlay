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
import { mensagemDeBloqueio } from '../../turma/jornada-mensagens';
import {
  CargaJornada,
  listarModulos,
  resolverThumbnail,
  resumoDaJornada,
} from './modulo-jornada';

const MODULO_BLOQUEADO =
  'Módulo bloqueado. Conclua o módulo anterior para liberá-lo.';

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

  private async carregar(
    usuario_id: number,
    manager?: EntityManager,
    jornadaPronta?: JornadaDaTurma | null,
  ): Promise<CargaJornada> {
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

  async findAll(usuario_id: number, manager?: EntityManager) {
    return listarModulos(await this.carregar(usuario_id, manager)).modulos;
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
    const { modulos, estados } = listarModulos(
      await this.carregar(usuario_id, manager, jornada),
    );
    const modulo = modulos.find((item) => item.id === aula.modulo_id);
    if (!modulo) throw new NotFoundException('Módulo não encontrado');
    if (modulo.locked) throw new ForbiddenException(MODULO_BLOQUEADO);
    const estado = estados?.get(aula.id);
    if (!estado)
      throw new BadRequestException(
        mensagemDeBloqueio('outside_journey', null),
      );
    if (estado.status === 'locked')
      throw new BadRequestException(
        mensagemDeBloqueio(estado.lockReason ?? 'sequence', estado.opensAt),
      );
    return true;
  }

  async getJourneySummary(usuario_id: number) {
    return resumoDaJornada(await this.findAll(usuario_id));
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

      return {
        ...this.aulaResumo(aula, progressByAula.get(aula.id)),
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
    const { modulos, estados } = listarModulos(carga);
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
    const thumbnail = resolverThumbnail(modulo.thumbnail);

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
