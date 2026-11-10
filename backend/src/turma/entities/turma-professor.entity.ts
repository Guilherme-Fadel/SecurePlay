import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'turma_professor', synchronize: false })
export class TurmaProfessor {
  @PrimaryColumn()
  turma_id: number;

  @PrimaryColumn()
  usuario_id: number;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  created_at: Date;
}
