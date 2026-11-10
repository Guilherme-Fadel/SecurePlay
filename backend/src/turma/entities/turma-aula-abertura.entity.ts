import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Sem linha = aula fechada para a turma; aberta quando abre_em <= agora (relógio da aplicação). */
@Entity({ name: 'turma_aula_abertura', synchronize: false })
export class TurmaAulaAbertura {
  @PrimaryColumn()
  turma_id: number;

  @PrimaryColumn()
  aula_id: number;

  @Column({ type: 'datetime' })
  abre_em: Date;

  @Column()
  definido_por_id: number;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updated_at: Date;
}
