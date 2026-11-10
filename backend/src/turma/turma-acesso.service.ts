import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { Usuario } from '../usuario/usuario.entity';
import { Turma } from './entities/turma.entity';
import { TurmaProfessor } from './entities/turma-professor.entity';

export interface Ator {
  id: number;
  role: Role;
  empresa_id: number | null;
}

export const TURMA_NAO_ENCONTRADA = 'Turma não encontrada';

/** Escopo de turma decidido no servidor: papel e empresa vêm do banco, nunca do corpo. */
@Injectable()
export class TurmaAcessoService {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) {}

  async carregarAtor(userId: number, manager?: EntityManager): Promise<Ator> {
    const usuario = await (manager ?? this.dataSource.manager)
      .getRepository(Usuario)
      .findOne({ where: { id: userId } });
    if (!usuario || !usuario.active)
      throw new ForbiddenException('Acesso indisponível');
    return {
      id: usuario.id,
      role: usuario.role,
      empresa_id: usuario.empresa_id ?? null,
    };
  }

  /** Professores vinculados, admin da escola e plataforma; fora do escopo = 404. */
  async assertPodeEditarJornada(
    ator: Ator,
    turmaId: number,
    opcoes: { manager?: EntityManager; lock?: boolean } = {},
  ): Promise<Turma> {
    const source = opcoes.manager ?? this.dataSource.manager;
    const turma = await source.getRepository(Turma).findOne({
      where: { id: turmaId },
      ...(opcoes.lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!turma) throw new NotFoundException(TURMA_NAO_ENCONTRADA);
    if (ator.role === Role.PLATFORM_ADMIN) return turma;
    const mesmaEscola =
      ator.empresa_id !== null && ator.empresa_id === turma.empresa_id;
    if (ator.role === Role.ADMIN && mesmaEscola) return turma;
    if (
      ator.role === Role.TEACHER &&
      mesmaEscola &&
      (await source.getRepository(TurmaProfessor).exists({
        where: { turma_id: turma.id, usuario_id: ator.id },
      }))
    )
      return turma;
    throw new NotFoundException(TURMA_NAO_ENCONTRADA);
  }
}
