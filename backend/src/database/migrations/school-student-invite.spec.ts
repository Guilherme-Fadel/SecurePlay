import { Table, TableColumn, TableIndex } from 'typeorm';
import { AddSchoolStudentInvite1792800000000 } from './1792800000000-add-school-student-invite';

describe('AddSchoolStudentInvite migration', () => {
  it('preserva e-mails legados e prepara o modo escolar com uso retrocompatível', async () => {
    const email = new TableColumn({ name: 'email', type: 'varchar', length: '100' });
    const userTable = new Table({ name: 'usuario', columns: [email], indices: [] });
    const queryRunner = {
      getTable: jest.fn().mockResolvedValue(userTable),
      hasColumn: jest.fn().mockResolvedValue(false),
      addColumn: jest.fn().mockResolvedValue(undefined),
      changeColumn: jest.fn().mockResolvedValue(undefined),
      createIndex: jest.fn().mockResolvedValue(undefined),
    };

    await new AddSchoolStudentInvite1792800000000().up(queryRunner as never);

    expect(queryRunner.changeColumn).toHaveBeenCalledWith(
      'usuario',
      email,
      expect.objectContaining({ name: 'email', isNullable: true }),
    );
    expect(queryRunner.createIndex).toHaveBeenCalledWith(
      'usuario',
      expect.objectContaining({
        name: 'ux_usuario_login_code',
        columnNames: ['login_code'],
        isUnique: true,
      } as Partial<TableIndex>),
    );
    const inviteMode = queryRunner.addColumn.mock.calls.find(
      ([table, column]) => table === 'convite' && column.name === 'registration_mode',
    )?.[1];
    expect(inviteMode).toEqual(expect.objectContaining({
      name: 'registration_mode',
      default: "'legacy_email'",
      isNullable: false,
    }));
  });

  it('interrompe rollback antes de qualquer remoção quando há contas sem e-mail', async () => {
    const email = new TableColumn({ name: 'email', type: 'varchar', length: '100', isNullable: true });
    const queryRunner = {
      getTable: jest.fn().mockResolvedValue(new Table({ name: 'usuario', columns: [email] })),
      query: jest.fn().mockResolvedValue([{ total: 1 }]),
      dropColumn: jest.fn(),
      dropIndex: jest.fn(),
      changeColumn: jest.fn(),
    };

    await expect(new AddSchoolStudentInvite1792800000000().down(queryRunner as never))
      .rejects.toThrow('existem usuários sem e-mail');
    expect(queryRunner.dropColumn).not.toHaveBeenCalled();
    expect(queryRunner.dropIndex).not.toHaveBeenCalled();
    expect(queryRunner.changeColumn).not.toHaveBeenCalled();
  });
});
