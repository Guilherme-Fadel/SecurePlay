import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum ModuloType {
  VIDEO = 'video',
  QUADRINHO = 'quadrinho',
  MISTO = 'misto',
}

export enum ModuloDifficulty {
  INICIANTE = 'iniciante',
  INTERMEDIARIO = 'intermediario',
  AVANCADO = 'avancado',
}

@Entity()
export class Modulo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  title: string;

  @Column({ length: 1000 })
  description: string;

  @Column({ length: 500, nullable: true })
  thumbnail: string;

  @Column({ type: 'enum', enum: ModuloType, default: ModuloType.MISTO })
  type: ModuloType;

  @Column({ length: 100 })
  category: string;

  @Column({
    type: 'enum',
    enum: ModuloDifficulty,
    default: ModuloDifficulty.INICIANTE,
  })
  difficulty: ModuloDifficulty;

  @Column({ default: 0 })
  xp_total: number;

  @Column({ default: 0 })
  xp_bonus: number;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
