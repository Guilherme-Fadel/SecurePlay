import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';

@Entity()
@Unique('UQ_usuario_arcade_stats_usuario_game', ['usuario_id', 'game_slug'])
export class UsuarioArcadeStats {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  usuario_id: number;

  @Column({ length: 80 })
  game_slug: string;

  @Column({ type: 'int', default: 0 })
  total_plays: number;

  @Column({ type: 'int', default: 0 })
  perfect_runs: number;

  @Column({ type: 'int', default: 0 })
  best_score: number;

  @Column({ type: 'datetime', nullable: true })
  last_played_at: Date | null;

  @UpdateDateColumn()
  updated_at: Date;
}
