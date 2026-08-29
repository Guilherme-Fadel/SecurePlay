import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';
import { Aula } from '../aula/aula.entity';

@Entity()
@Unique('UQ_usuario_aula_usuario_aula', ['usuario_id', 'aula_id'])
export class UsuarioAula {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  usuario_id: number;

  @ManyToOne(() => Aula)
  @JoinColumn({ name: 'aula_id' })
  aula: Aula;

  @Column()
  aula_id: number;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'datetime', nullable: true })
  completed_at: Date;

  @Column({ type: 'datetime', nullable: true })
  started_at: Date;

  @Column({ type: 'datetime', nullable: true })
  last_accessed_at: Date;

  @Column({ type: 'int', default: 0 })
  progress_percent: number;

  @Column({ type: 'int', nullable: true })
  last_video_second: number;

  @Column({ type: 'int', nullable: true })
  last_page: number;
}
