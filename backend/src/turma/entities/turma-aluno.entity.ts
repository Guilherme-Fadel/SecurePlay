import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Um aluno em uma turma por vez: a chave é o próprio usuário. */
@Entity({ name: 'turma_aluno', synchronize: false })
export class TurmaAluno {
  @PrimaryColumn()
  usuario_id: number;

  @Column()
  turma_id: number;

  @Column({ type: 'datetime', precision: 6 })
  entrou_em: Date;
}
