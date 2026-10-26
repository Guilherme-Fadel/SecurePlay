import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';

export type ActivityType =
  | 'challenge'
  | 'lesson'
  | 'lesson_quiz'
  | 'module'
  | 'arcade';
export interface CompletionNotification {
  id: number;
  usuario_id: number;
  title: string;
  message: string;
  type: string;
  created_at: Date | string;
}

/** Resultado durável e outbox da mesma transação da conclusão/recompensa. */
@Entity({ name: 'activity_completion', synchronize: false })
@Index(
  'ux_activity_completion_source',
  ['usuario_id', 'activity_type', 'activity_id'],
  { unique: true },
)
@Index('ix_activity_completion_pending', ['effects_processed', 'created_at'])
export class ActivityCompletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  usuario_id: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'fk_activity_completion_usuario',
  })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 16 })
  activity_type: ActivityType;

  @Column()
  activity_id: number;

  @Column({ type: 'json' })
  result: Record<string, unknown>;

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 0 })
  previous_points: number;

  @Column({ type: 'json', nullable: true })
  notifications: CompletionNotification[] | null;

  @Column({ default: false })
  effects_processed: boolean;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  created_at: Date;
}
