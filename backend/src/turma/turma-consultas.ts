import { EntityManager, In, MoreThan } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Turma } from './entities/turma.entity';
import { TurmaProfessor } from './entities/turma-professor.entity';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaAulaAbertura } from './entities/turma-aula-abertura.entity';

export interface TurmaResumo {
  id: number;
  nome: string;
  ano_letivo: number;
  ativa: boolean;
  professores: number;
  alunos: number;
  proxima_abertura: string | null;
}

export interface Paginado<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AlunoDaTurma {
  id: number;
  name: string;
  nickname: string | null;
  entrou_em: string;
}

export interface FiltrosPaginacao {
  page?: number;
  pageSize?: number;
  busca?: string;
}

export interface FiltrosTurmas extends FiltrosPaginacao {
  ano_letivo?: number;
  situacao?: 'ativa' | 'arquivada';
}

/** Mesma normalização das listagens administrativas existentes. */
export function normalizarPaginacao(filtros: FiltrosPaginacao) {
  return {
    page: Number.isFinite(filtros.page)
      ? Math.max(1, Math.floor(filtros.page as number))
      : 1,
    pageSize: Number.isFinite(filtros.pageSize)
      ? Math.min(100, Math.max(1, Math.floor(filtros.pageSize as number)))
      : 25,
    busca: filtros.busca?.trim().slice(0, 100) || undefined,
  };
}

export function padraoLike(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function paginado<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginado<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

type Contagem = { turma_id: number | string; total: number | string };

function contarPorTurma(
  manager: EntityManager,
  entity: typeof TurmaProfessor | typeof TurmaAluno,
  ids: number[],
) {
  return manager
    .getRepository(entity)
    .createQueryBuilder('v')
    .select('v.turma_id', 'turma_id')
    .addSelect('COUNT(*)', 'total')
    .where('v.turma_id IN (:...ids)', { ids })
    .groupBy('v.turma_id')
    .getRawMany<Contagem>()
    .then(
      (rows) =>
        new Map(rows.map((row) => [Number(row.turma_id), Number(row.total)])),
    );
}

async function proximasAberturas(manager: EntityManager, ids: number[]) {
  const futuras = await manager.getRepository(TurmaAulaAbertura).find({
    where: { turma_id: In(ids), abre_em: MoreThan(new Date()) },
  });
  const proxima = new Map<number, Date>();
  for (const abertura of futuras) {
    const atual = proxima.get(abertura.turma_id);
    if (!atual || abertura.abre_em < atual)
      proxima.set(abertura.turma_id, abertura.abre_em);
  }
  return proxima;
}

export async function resumirTurmas(
  manager: EntityManager,
  turmas: Turma[],
): Promise<TurmaResumo[]> {
  if (!turmas.length) return [];
  const ids = turmas.map((turma) => turma.id);
  const [professores, alunos, proxima] = await Promise.all([
    contarPorTurma(manager, TurmaProfessor, ids),
    contarPorTurma(manager, TurmaAluno, ids),
    proximasAberturas(manager, ids),
  ]);
  return turmas.map((turma) => ({
    id: turma.id,
    nome: turma.nome,
    ano_letivo: turma.ano_letivo,
    ativa: !!turma.ativa,
    professores: professores.get(turma.id) ?? 0,
    alunos: alunos.get(turma.id) ?? 0,
    proxima_abertura: proxima.get(turma.id)?.toISOString() ?? null,
  }));
}

export async function listarTurmas(
  manager: EntityManager,
  filtros: FiltrosTurmas & { empresaId?: number; turmaIds?: number[] },
): Promise<Paginado<TurmaResumo>> {
  const { page, pageSize, busca } = normalizarPaginacao(filtros);
  const query = manager.getRepository(Turma).createQueryBuilder('t');
  if (filtros.empresaId !== undefined)
    query.andWhere('t.empresa_id = :empresaId', {
      empresaId: filtros.empresaId,
    });
  if (filtros.turmaIds) {
    if (!filtros.turmaIds.length) return paginado([], 0, page, pageSize);
    query.andWhere('t.id IN (:...turmaIds)', { turmaIds: filtros.turmaIds });
  }
  if (busca) query.andWhere('t.nome LIKE :busca', { busca: padraoLike(busca) });
  if (filtros.ano_letivo)
    query.andWhere('t.ano_letivo = :ano', { ano: filtros.ano_letivo });
  if (filtros.situacao)
    query.andWhere('t.ativa = :ativa', { ativa: filtros.situacao === 'ativa' });
  const [turmas, total] = await query
    .orderBy('t.ano_letivo', 'DESC')
    .addOrderBy('t.nome', 'ASC')
    .addOrderBy('t.id', 'ASC')
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getManyAndCount();
  return paginado(await resumirTurmas(manager, turmas), total, page, pageSize);
}

export async function listarProfessoresDaTurma(
  manager: EntityManager,
  turmaId: number,
): Promise<Array<{ id: number; name: string; email: string }>> {
  const rows = await manager
    .getRepository(TurmaProfessor)
    .createQueryBuilder('p')
    .innerJoin(Usuario, 'u', 'u.id = p.usuario_id')
    .select('u.id', 'id')
    .addSelect('u.name', 'name')
    .addSelect('u.email', 'email')
    .where('p.turma_id = :turmaId', { turmaId })
    .orderBy('u.name', 'ASC')
    .getRawMany<{ id: number | string; name: string; email: string }>();
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    email: row.email,
  }));
}

/** Alunos de uma turma sem e-mail, login ou dados de cadastro. */
export async function listarAlunosDaTurma(
  manager: EntityManager,
  turmaId: number,
  filtros: FiltrosPaginacao,
): Promise<Paginado<AlunoDaTurma>> {
  const { page, pageSize, busca } = normalizarPaginacao(filtros);
  const query = manager
    .getRepository(TurmaAluno)
    .createQueryBuilder('ta')
    .innerJoin(Usuario, 'u', 'u.id = ta.usuario_id')
    .addSelect('u.id', 'u_id')
    .addSelect('u.name', 'u_name')
    .addSelect('u.nickname', 'u_nickname')
    .where('ta.turma_id = :turmaId', { turmaId });
  if (busca)
    query.andWhere('(u.name LIKE :busca OR u.nickname LIKE :busca)', {
      busca: padraoLike(busca),
    });
  const total = await query.getCount();
  const { raw, entities } = await query
    .orderBy('u.name', 'ASC')
    .addOrderBy('u.id', 'ASC')
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .getRawAndEntities<{
      u_id: number | string;
      u_name: string;
      u_nickname: string | null;
    }>();
  const entradas = new Map(
    entities.map((row) => [row.usuario_id, row.entrou_em]),
  );
  return paginado(
    raw.map((row) => ({
      id: Number(row.u_id),
      name: row.u_name,
      nickname: row.u_nickname,
      entrou_em: entradas.get(Number(row.u_id))!.toISOString(),
    })),
    total,
    page,
    pageSize,
  );
}
