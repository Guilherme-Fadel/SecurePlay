import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';
import { Achievement } from './achievement.entity';

@Entity()
@Unique('UQ_usuario_achievement_usuario_achievement', [
  'usuario_id',
  'achievement_id',
])
export class UsuarioAchievement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  usuario_id: number;

  @ManyToOne(() => Achievement)
  @JoinColumn({ name: 'achievement_id' })
  achievement: Achievement;

  @Column()
  achievement_id: number;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ default: false })
  unlocked: boolean;

  @Column({ type: 'datetime', nullable: true })
  unlocked_at: Date | null;
}
