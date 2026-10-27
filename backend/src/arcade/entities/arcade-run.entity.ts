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
import { ArcadeGameType } from './arcade-game.entity';
import type { GameCorrection } from '../games/game-handler';

@Entity({ name: 'arcade_run'})
@Index('ux_arcade_run_uuid', ['run_id'], { unique: true })
@Index('ix_arcade_run_pending', ['completed', 'submitted_at'])
@Index('ix_arcade_run_expiry', ['expires_at'])
export class ArcadeRun {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 36 }) run_id: string;
  @Column() usuario_id: number;
  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'fk_arcade_run_usuario',
  })
  usuario: Usuario;
  @Column({ type: 'varchar', length: 80 }) slug: string;
  @Column({ type: 'varchar', length: 24 }) game_type: ArcadeGameType;
  @Column() xp_base: number;
  @Column({ type: 'json', nullable: true }) answer_key: unknown;
  @Column({ type: 'json', nullable: true }) correction: GameCorrection | null;
  @Column({ type: 'datetime', precision: 6 }) expires_at: Date;
  @Column({ type: 'datetime', precision: 6, nullable: true })
  submitted_at: Date | null;
  @Column({ default: false }) completed: boolean;
  @CreateDateColumn({ type: 'datetime', precision: 6 }) created_at: Date;
}
