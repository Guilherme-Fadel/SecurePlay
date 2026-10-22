import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresa/empresa.entity';
import { Usuario } from '../../usuario/usuario.entity';

export const SCHOOL_PILOT_STATUSES = [
  'planned',
  'active',
  'paused',
  'completed',
  'converted',
  'cancelled',
] as const;

export type SchoolPilotStatus = (typeof SCHOOL_PILOT_STATUSES)[number];

@Entity('school_pilot')
@Index('ix_school_pilot_empresa_created', ['empresa_id', 'created_at'])
export class SchoolPilot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @ManyToOne(() => Empresa, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @Column({ type: 'int', nullable: true })
  contact_admin_user_id: number | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_admin_user_id' })
  contact_admin: Usuario | null;

  @Column({ type: 'varchar', length: 500 })
  objective: string;

  @Column({ type: 'varchar', length: 20, default: 'planned' })
  status: SchoolPilotStatus;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  agreed_end_date: string | null;

  @Column({ type: 'datetime', nullable: true })
  next_weekly_meeting_at: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  next_action: string | null;

  @Column({ type: 'datetime', nullable: true })
  next_action_at: Date | null;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 6 })
  updated_at: Date;
}
