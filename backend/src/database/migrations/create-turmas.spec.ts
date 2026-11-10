import { Table } from 'typeorm';
import { CreateTurmas1793577600000 } from './1793577600000-create-turmas';

const TABELAS = [
  'turma',
  'turma_professor',
  'turma_aluno',
  'turma_modulo',
  'turma_aula_abertura',
  'convite_turma',
];

function runner(existentes: string[] = []) {
  return {
    hasTable: jest.fn((name: string) =>
      Promise.resolve(existentes.includes(name)),
    ),
    createTable: jest.fn(() => Promise.resolve()),
    dropTable: jest.fn(() => Promise.resolve()),
    addColumn: jest.fn(),
    changeColumn: jest.fn(),
    query: jest.fn(),
  };
}

function criadas(r: ReturnType<typeof runner>): Table[] {
  return r.createTable.mock.calls.map(
    (call) => (call as unknown as [Table])[0],
  );
}

describe('CreateTurmas migration', () => {
  it('cria as seis tabelas com turma antes das dependentes', async () => {
    const r = runner();
    await new CreateTurmas1793577600000().up(r as never);
    expect(criadas(r).map((table) => table.name)).toEqual(TABELAS);
  });

  it('não recria tabela que já existe', async () => {
    const r = runner(['turma', 'turma_modulo']);
    await new CreateTurmas1793577600000().up(r as never);
    const nomes = criadas(r).map((table) => table.name);
    expect(nomes).not.toContain('turma');
    expect(nomes).not.toContain('turma_modulo');
    expect(nomes).toContain('turma_aluno');
  });

  it('remove as tabelas na ordem inversa', async () => {
    const r = runner(TABELAS);
    await new CreateTurmas1793577600000().down(r as never);
    expect(
      r.dropTable.mock.calls.map((call) => (call as unknown as [string])[0]),
    ).toEqual([...TABELAS].reverse());
  });

  it('grava abre_em como datetime obrigatório e sem default', async () => {
    const r = runner();
    await new CreateTurmas1793577600000().up(r as never);
    const abertura = criadas(r).find((t) => t.name === 'turma_aula_abertura')!;
    const coluna = abertura.columns.find((c) => c.name === 'abre_em')!;
    expect(coluna.type).toBe('datetime');
    expect(coluna.isNullable).toBe(false);
    expect(coluna.default).toBeUndefined();
  });

  it('usa chaves e índices da spec', async () => {
    const r = runner();
    await new CreateTurmas1793577600000().up(r as never);
    const porNome = new Map(criadas(r).map((t) => [t.name, t]));
    const primarias = (name: string) =>
      porNome
        .get(name)!
        .columns.filter((c) => c.isPrimary)
        .map((c) => c.name);
    expect(primarias('turma_professor')).toEqual(['turma_id', 'usuario_id']);
    expect(primarias('turma_aluno')).toEqual(['usuario_id']);
    expect(primarias('turma_modulo')).toEqual(['turma_id', 'modulo_id']);
    expect(primarias('turma_aula_abertura')).toEqual(['turma_id', 'aula_id']);
    expect(primarias('convite_turma')).toEqual(['convite_id']);
    const indices = criadas(r).flatMap((t) =>
      t.indices.map((i) => ({
        nome: i.name,
        unico: !!i.isUnique,
        colunas: i.columnNames,
      })),
    );
    expect(indices).toEqual(
      expect.arrayContaining([
        {
          nome: 'ux_turma_empresa_ano_nome',
          unico: true,
          colunas: ['empresa_id', 'ano_letivo', 'nome'],
        },
        {
          nome: 'ix_turma_professor_usuario',
          unico: false,
          colunas: ['usuario_id'],
        },
        { nome: 'ix_turma_aluno_turma', unico: false, colunas: ['turma_id'] },
        { nome: 'ix_convite_turma_turma', unico: false, colunas: ['turma_id'] },
      ]),
    );
    for (const table of criadas(r)) {
      for (const fk of table.foreignKeys) expect(fk.onDelete).toBe('RESTRICT');
    }
  });

  it('não altera tabelas existentes do sistema', async () => {
    const r = runner();
    await new CreateTurmas1793577600000().up(r as never);
    expect(r.addColumn).not.toHaveBeenCalled();
    expect(r.changeColumn).not.toHaveBeenCalled();
    expect(r.query).not.toHaveBeenCalled();
  });
});
