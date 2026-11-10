import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../auth/roles.enum';
import { Usuario } from '../usuario/usuario.entity';
import { Turma } from './entities/turma.entity';
import { TurmaProfessor } from './entities/turma-professor.entity';
import { TurmaAcessoService } from './turma-acesso.service';

const TURMA_A = { id: 1, empresa_id: 10, ativa: true } as Turma;
const TURMA_B = { id: 2, empresa_id: 20, ativa: true } as Turma;

function build(
  usuarios: Array<Partial<Usuario>> = [],
  professores: Array<{ turma_id: number; usuario_id: number }> = [],
) {
  const turmas = [TURMA_A, TURMA_B];
  const repos = new Map<unknown, unknown>([
    [
      Turma,
      {
        findOne: jest.fn(({ where }: { where: { id: number } }) =>
          Promise.resolve(turmas.find((t) => t.id === where.id) ?? null),
        ),
      },
    ],
    [
      TurmaProfessor,
      {
        exists: jest.fn(
          ({ where }: { where: { turma_id: number; usuario_id: number } }) =>
            Promise.resolve(
              professores.some(
                (p) =>
                  p.turma_id === where.turma_id &&
                  p.usuario_id === where.usuario_id,
              ),
            ),
        ),
      },
    ],
    [
      Usuario,
      {
        findOne: jest.fn(({ where }: { where: { id: number } }) =>
          Promise.resolve(usuarios.find((u) => u.id === where.id) ?? null),
        ),
      },
    ],
  ]);
  const manager = { getRepository: (entity: unknown) => repos.get(entity) };
  return new TurmaAcessoService({ manager } as never);
}

const ator = (id: number, role: Role, empresa_id: number | null) => ({
  id,
  role,
  empresa_id,
});

describe('TurmaAcessoService.carregarAtor', () => {
  it('lê papel e empresa do banco', async () => {
    const service = build([
      { id: 5, role: Role.TEACHER, empresa_id: 10, active: true },
    ]);
    await expect(service.carregarAtor(5)).resolves.toEqual(
      ator(5, Role.TEACHER, 10),
    );
  });

  it('recusa conta inativa ou inexistente', async () => {
    const service = build([
      { id: 5, role: Role.ADMIN, empresa_id: 10, active: false },
    ]);
    await expect(service.carregarAtor(5)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.carregarAtor(6)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('TurmaAcessoService.assertPodeEditarJornada', () => {
  const professores = [{ turma_id: 1, usuario_id: 5 }];
  const naoEncontrada = async (promise: Promise<unknown>) => {
    await expect(promise).rejects.toBeInstanceOf(NotFoundException);
    await expect(promise).rejects.toThrow('Turma não encontrada');
  };

  it('platform_admin edita qualquer turma', async () => {
    await expect(
      build([], professores).assertPodeEditarJornada(
        ator(9, Role.PLATFORM_ADMIN, null),
        2,
      ),
    ).resolves.toBe(TURMA_B);
  });

  it('admin edita turmas da própria escola', async () => {
    await expect(
      build([], professores).assertPodeEditarJornada(
        ator(1, Role.ADMIN, 10),
        1,
      ),
    ).resolves.toBe(TURMA_A);
  });

  it('admin de outra escola recebe 404', async () => {
    await naoEncontrada(
      build([], professores).assertPodeEditarJornada(
        ator(2, Role.ADMIN, 20),
        1,
      ),
    );
  });

  it('professor vinculado edita a turma', async () => {
    await expect(
      build([], professores).assertPodeEditarJornada(
        ator(5, Role.TEACHER, 10),
        1,
      ),
    ).resolves.toBe(TURMA_A);
  });

  it('professor não vinculado recebe 404', async () => {
    await naoEncontrada(
      build([], professores).assertPodeEditarJornada(
        ator(6, Role.TEACHER, 10),
        1,
      ),
    );
  });

  it('professor vinculado mas de outra escola recebe 404', async () => {
    await naoEncontrada(
      build([], [{ turma_id: 2, usuario_id: 5 }]).assertPodeEditarJornada(
        ator(5, Role.TEACHER, 10),
        2,
      ),
    );
  });

  it('aluno recebe 404', async () => {
    await naoEncontrada(
      build([], professores).assertPodeEditarJornada(ator(3, Role.USER, 10), 1),
    );
  });

  it('turma inexistente responde igual a turma fora do escopo', async () => {
    await naoEncontrada(
      build([], professores).assertPodeEditarJornada(
        ator(1, Role.ADMIN, 10),
        99,
      ),
    );
  });
});
