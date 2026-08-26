import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';
import { Aula } from '../aula/aula.entity';

@Entity()
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

  @Column({ nullable: true })
  completed_at: Date;
}
