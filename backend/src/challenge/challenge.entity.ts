import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum ChallengeDifficulty {
  INICIANTE     = 'iniciante',
  INTERMEDIARIO = 'intermediario',
  AVANCADO      = 'avancado',
}

@Entity()
export class Challenge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  title: string;

  @Column({ length: 500 })
  description: string;

  @Column({ type: 'enum', enum: ChallengeDifficulty, default: ChallengeDifficulty.INICIANTE })
  difficulty: ChallengeDifficulty;

  @Column()
  duration: number;

  @Column()
  points: number;

  @Column({ default: true })
  active: boolean;
}
