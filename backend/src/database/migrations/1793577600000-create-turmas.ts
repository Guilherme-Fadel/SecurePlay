import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

type ForeignKey = {
  name: string;
  columnNames: string[];
  referencedTableName: string;
  referencedColumnNames: string[];
  onDelete: 'RESTRICT';
};

function fk(name: string, column: string, table: string): ForeignKey {
  return {
    name,
    columnNames: [column],
    referencedTableName: table,
    referencedColumnNames: ['id'],
    onDelete: 'RESTRICT',
  };
}

const createdAt = {
  name: 'created_at',
  type: 'datetime',
  precision: 6,
  default: 'CURRENT_TIMESTAMP(6)',
};
const updatedAt = {
  name: 'updated_at',
  type: 'datetime',
  precision: 6,
  default: 'CURRENT_TIMESTAMP(6)',
  onUpdate: 'CURRENT_TIMESTAMP(6)',
};

/** Turmas, vínculos e jornada da turma. Tabelas fora do synchronize; nenhuma tabela existente muda. */
const TABLES: Table[] = [
  new Table({
    name: 'turma',
    columns: [
      {
        name: 'id',
        type: 'int',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
      },
      { name: 'empresa_id', type: 'int' },
      { name: 'nome', type: 'varchar', length: '80' },
      { name: 'ano_letivo', type: 'smallint' },
      { name: 'ativa', type: 'tinyint', width: 1, default: 1 },
      createdAt,
      updatedAt,
    ],
    indices: [
      new TableIndex({
        name: 'ux_turma_empresa_ano_nome',
        columnNames: ['empresa_id', 'ano_letivo', 'nome'],
        isUnique: true,
      }),
    ],
    foreignKeys: [fk('fk_turma_empresa', 'empresa_id', 'empresa')],
  }),
  new Table({
    name: 'turma_professor',
    columns: [
      { name: 'turma_id', type: 'int', isPrimary: true },
      { name: 'usuario_id', type: 'int', isPrimary: true },
      createdAt,
    ],
    indices: [
      new TableIndex({
        name: 'ix_turma_professor_usuario',
        columnNames: ['usuario_id'],
      }),
    ],
    foreignKeys: [
      fk('fk_turma_professor_turma', 'turma_id', 'turma'),
      fk('fk_turma_professor_usuario', 'usuario_id', 'usuario'),
    ],
  }),
  new Table({
    name: 'turma_aluno',
    columns: [
      { name: 'usuario_id', type: 'int', isPrimary: true },
      { name: 'turma_id', type: 'int' },
      {
        name: 'entrou_em',
        type: 'datetime',
        precision: 6,
        default: 'CURRENT_TIMESTAMP(6)',
      },
    ],
    indices: [
      new TableIndex({ name: 'ix_turma_aluno_turma', columnNames: ['turma_id'] }),
    ],
    foreignKeys: [
      fk('fk_turma_aluno_usuario', 'usuario_id', 'usuario'),
      fk('fk_turma_aluno_turma', 'turma_id', 'turma'),
    ],
  }),
  new Table({
    name: 'turma_modulo',
    columns: [
      { name: 'turma_id', type: 'int', isPrimary: true },
      { name: 'modulo_id', type: 'int', isPrimary: true },
      { name: 'posicao', type: 'smallint' },
    ],
    foreignKeys: [
      fk('fk_turma_modulo_turma', 'turma_id', 'turma'),
      fk('fk_turma_modulo_modulo', 'modulo_id', 'modulo'),
    ],
  }),
  new Table({
    name: 'turma_aula_abertura',
    columns: [
      { name: 'turma_id', type: 'int', isPrimary: true },
      { name: 'aula_id', type: 'int', isPrimary: true },
      { name: 'abre_em', type: 'datetime', isNullable: false },
      { name: 'definido_por_id', type: 'int' },
      updatedAt,
    ],
    foreignKeys: [
      fk('fk_turma_aula_abertura_turma', 'turma_id', 'turma'),
      fk('fk_turma_aula_abertura_aula', 'aula_id', 'aula'),
      fk('fk_turma_aula_abertura_ator', 'definido_por_id', 'usuario'),
    ],
  }),
  new Table({
    name: 'convite_turma',
    columns: [
      { name: 'convite_id', type: 'int', isPrimary: true },
      { name: 'turma_id', type: 'int' },
    ],
    indices: [
      new TableIndex({ name: 'ix_convite_turma_turma', columnNames: ['turma_id'] }),
    ],
    foreignKeys: [
      fk('fk_convite_turma_convite', 'convite_id', 'convite'),
      fk('fk_convite_turma_turma', 'turma_id', 'turma'),
    ],
  }),
];

export class CreateTurmas1793577600000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      if (await runner.hasTable(table.name)) continue;
      await runner.createTable(table);
    }
  }

  /** Apaga turmas, vínculos e aberturas: perda irreversível, somente após backup. */
  async down(runner: QueryRunner): Promise<void> {
    for (const table of [...TABLES].reverse()) {
      if (await runner.hasTable(table.name)) await runner.dropTable(table.name);
    }
  }
}
