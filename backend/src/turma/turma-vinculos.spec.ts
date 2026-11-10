import { Role } from '../auth/roles.enum';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaProfessor } from './entities/turma-professor.entity';
import { removerVinculosAoMudarPapel } from './turma-vinculos';

const TEACHER = 'teacher' as Role;

function manager() {
  return { delete: jest.fn().mockResolvedValue({ affected: 1 }) };
}

describe('removerVinculosAoMudarPapel', () => {
  it('remove os vínculos de professor quando deixa de ser professor', async () => {
    const m = manager();
    await removerVinculosAoMudarPapel(m as never, 5, TEACHER, Role.ADMIN);
    expect(m.delete).toHaveBeenCalledWith(TurmaProfessor, { usuario_id: 5 });
    expect(m.delete).not.toHaveBeenCalledWith(TurmaAluno, expect.anything());
  });

  it('remove o vínculo de aluno quando o aluno vira professor', async () => {
    const m = manager();
    await removerVinculosAoMudarPapel(m as never, 5, Role.USER, TEACHER);
    expect(m.delete).toHaveBeenCalledWith(TurmaAluno, { usuario_id: 5 });
    expect(m.delete).not.toHaveBeenCalledWith(
      TurmaProfessor,
      expect.anything(),
    );
  });

  it('remove o vínculo de aluno quando o aluno vira administrador', async () => {
    const m = manager();
    await removerVinculosAoMudarPapel(m as never, 5, Role.USER, Role.ADMIN);
    expect(m.delete).toHaveBeenCalledWith(TurmaAluno, { usuario_id: 5 });
  });

  it('não toca as tabelas quando o papel não muda', async () => {
    const m = manager();
    await removerVinculosAoMudarPapel(m as never, 5, Role.USER, Role.USER);
    await removerVinculosAoMudarPapel(m as never, 5, TEACHER, TEACHER);
    expect(m.delete).not.toHaveBeenCalled();
  });
});
