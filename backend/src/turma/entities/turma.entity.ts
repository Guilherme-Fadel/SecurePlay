import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Criada pela migration CreateTurmas1793577600000; fora do synchronize. */
@Entity({ name: 'turma', synchronize: false })
export class Turma {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @Column({ type: 'varchar', length: 80 })
  nome: string;

  @Column({ type: 'smallint' })
  ano_letivo: number;

  @Column({ type: 'boolean', default: true })
  ativa: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updated_at: Date;
}
