import { Role } from '../auth/roles.enum';

/** Qualquer objeto com `query` do TypeORM (DataSource ou Repository). */
export interface ConsultaSql {
  query(sql: string, parametros?: unknown[]): Promise<unknown>;
}

async function ids(
  db: ConsultaSql,
  sql: string,
  parametros: unknown[],
): Promise<number[]> {
  const linhas = (await db.query(sql, parametros)) as Array<{ id: number }>;
  return (linhas ?? []).map((linha) => Number(linha.id));
}

/** Admins ativos da escola; alunos e professores nunca entram. */
export function adminsDaEmpresa(
  db: ConsultaSql,
  empresaId: number,
): Promise<number[]> {
  return ids(
    db,
    'SELECT id FROM usuario WHERE empresa_id = ? AND role = ? AND active = 1',
    [empresaId, Role.ADMIN],
  );
}

/** Professores ativos vinculados à turma, restritos à escola dela. */
export function professoresDaTurma(
  db: ConsultaSql,
  turmaId: number,
  empresaId: number,
): Promise<number[]> {
  return ids(
    db,
    `SELECT u.id FROM turma_professor tp
       INNER JOIN usuario u ON u.id = tp.usuario_id
       WHERE tp.turma_id = ? AND u.empresa_id = ? AND u.role = ? AND u.active = 1`,
    [turmaId, empresaId, Role.TEACHER],
  );
}
