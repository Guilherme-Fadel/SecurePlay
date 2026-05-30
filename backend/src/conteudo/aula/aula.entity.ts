import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Modulo } from '../modulo/modulo.entity';

export enum AulaType {
  VIDEO = 'video',
  QUADRINHO = 'quadrinho',
}

@Entity()
export class Aula {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Modulo)
  @JoinColumn({ name: 'modulo_id' })
  modulo: Modulo;

  @Column()
  modulo_id: number;

  @Column({ length: 150 })
  title: string;

  @Column({ length: 1000, nullable: true })
  description: string;

  @Column({ type: 'enum', enum: AulaType, default: AulaType.VIDEO })
  type: AulaType;

  @Column({ length: 500, nullable: true })
  content_url: string;

  @Column('json', { nullable: true })
  pages: string[];

  @Column({ default: 0 })
  duration: number;

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 0 })
  order: number;

  @Column({ length: 100, nullable: true })
  section_name: string;

  @Column({ default: true })
  active: boolean;
}
