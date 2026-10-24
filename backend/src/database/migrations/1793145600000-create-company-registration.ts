import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCompanyRegistration1793145600000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (await runner.hasTable('company_registration')) return;
    const fields: [string, string][] = [
      ['razao_social', '180'],
      ['cnpj', '14'],
      ['unidade', '100'],
      ['contato_nome', '100'],
      ['contato_email', '100'],
      ['contato_telefone', '16'],
      ['cep', '8'],
      ['logradouro', '180'],
      ['numero', '20'],
      ['complemento', '100'],
      ['bairro', '100'],
      ['cidade', '100'],
      ['uf', '2'],
    ];
    await runner.createTable(
      new Table({
        name: 'company_registration',
        columns: [
          { name: 'empresa_id', type: 'int', isPrimary: true },
          ...fields.map(([name, length]) => ({
            name,
            type: 'varchar',
            length,
            isNullable: true,
            ...(name === 'cnpj'
              ? { charset: 'ascii', collation: 'ascii_general_ci' }
              : {}),
            ...(name === 'unidade'
              ? { charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' }
              : {}),
          })),
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
        ],
        indices: [
          {
            name: 'ux_company_registration_unit',
            columnNames: ['cnpj', 'unidade'],
            isUnique: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['empresa_id'],
            referencedTableName: 'empresa',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasTable('company_registration'))) return;
    const rows: unknown = await runner.query(
      'SELECT empresa_id FROM company_registration LIMIT 1',
    );
    if (!Array.isArray(rows) || rows.length)
      throw new Error(
        'Rollback bloqueado: preserve os dados cadastrais antes de remover a tabela',
      );
    await runner.dropTable('company_registration');
  }
}
