import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
export enum ArcadeGameType {
  QUIZ = 'quiz',
  PHISHING = 'phishing',
  DATA_CLASSIFY = 'data_classify',
  CLIENT_ONLY = 'client_only',
}
@Entity()
export class ArcadeGame {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true, length: 40 })
  slug: string;
  @Column({ type: 'enum', enum: ArcadeGameType })
  game_type: ArcadeGameType;
  @Column({ length: 120 })
  title: string;
  @Column({ length: 300 })
  description: string;
  @Column({ length: 40 })
  tag: string;
  @Column()
  xp_base: number;
  @Column({ length: 9 })
  color: string;
  @Column({ length: 9 })
  color_dark: string;
  @Column({ type: 'varchar', length: 200, nullable: true })
  image: string | null;
  @Column({ default: true })
  active: boolean;
  @CreateDateColumn()
  created_at: Date;
}
