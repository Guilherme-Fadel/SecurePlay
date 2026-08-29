import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AchievementRarity } from './achievement.entity';

export enum CosmeticType {
  FRAME = 'frame',
  BACKGROUND = 'background',
  TITLE = 'title',
  BADGE = 'badge',
  EFFECT = 'effect',
}

@Entity()
export class CosmeticItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 80 })
  slug: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 400 })
  description: string;

  @Column({ type: 'enum', enum: CosmeticType })
  type: CosmeticType;

  @Column({ type: 'enum', enum: AchievementRarity })
  rarity: AchievementRarity;

  @Column({ type: 'int' })
  price: number;

  @Column({ length: 160 })
  visual_value: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  required_achievement_slug: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
