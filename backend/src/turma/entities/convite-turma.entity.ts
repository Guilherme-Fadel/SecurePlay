import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Liga um convite de aluno à turma sem alterar a tabela sincronizada `convite`. */
@Entity({ name: 'convite_turma', synchronize: false })
export class ConviteTurma {
  @PrimaryColumn()
  convite_id: number;

  @Column()
  turma_id: number;
}
