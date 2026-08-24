import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Challenge } from '../challenge/challenge.entity';

@Entity()
export class UsuarioChallenge {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  usuario_id: number;

  @ManyToOne(() => Challenge)
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column()
  challenge_id: number;

  @Column({ default: 0 })
  progress: number; 

  @Column({ default: false })
  completed: boolean;

  @Column('json', { nullable: true })
  answered_question_ids: number[];

  @CreateDateColumn()
  started_at: Date;

  @Column({ nullable: true })
  completed_at: Date;
}
