import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

export type CheckinRefillStatus = 'pending' | 'started' | 'done' | 'skipped';

@Entity({ name: 'daily_checkin', synchronize: false })
export class DailyCheckin {
  @PrimaryColumn() usuario_id: number;
  @PrimaryColumn({ type: 'date' }) day: string;
  @Column() streak: number;
  @Column() bonus_xp: number;
  @Column({ type: 'varchar', length: 8 }) refill_status: CheckinRefillStatus;
  @Column({ type: 'datetime', precision: 6, nullable: true })
  refill_started_at: Date | null;
  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'fk_checkin_usuario',
  })
  usuario: Usuario;
}
