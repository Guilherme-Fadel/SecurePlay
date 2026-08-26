import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Aula } from '../aula/aula.entity';

@Entity()
export class AulaQuiz {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Aula)
  @JoinColumn({ name: 'aula_id' })
  aula: Aula;

  @Column()
  aula_id: number;

  @Column({ length: 500 })
  text: string;

  @Column('json')
  options: string[];

  @Column()
  correct_index: number;

  @Column({ default: 0 })
  order: number;
}
