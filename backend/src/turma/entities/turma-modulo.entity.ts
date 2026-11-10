import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'turma_modulo', synchronize: false })
export class TurmaModulo {
  @PrimaryColumn()
  turma_id: number;

  @PrimaryColumn()
  modulo_id: number;

  @Column({ type: 'smallint' })
  posicao: number;
}
