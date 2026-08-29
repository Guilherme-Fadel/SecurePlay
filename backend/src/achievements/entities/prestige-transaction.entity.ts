import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';

export enum PrestigeTransactionType {
  LEVEL = 'level',
  ACHIEVEMENT = 'achievement',
  PURCHASE = 'purchase',
  ADJUSTMENT = 'adjustment',
}

@Entity()
@Unique('UQ_prestige_transaction_usuario_source', ['usuario_id', 'source_key'])
export class PrestigeTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  usuario_id: number;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'enum', enum: PrestigeTransactionType })
  type: PrestigeTransactionType;

  @Column({ length: 140 })
  source_key: string;

  @Column({ length: 240 })
  description: string;

  @CreateDateColumn()
  created_at: Date;
}
