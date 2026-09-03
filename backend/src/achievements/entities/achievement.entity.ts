import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AchievementCategory {
  SENTINEL = 'sentinel',
  SPECIALIST = 'specialist',
  INVESTIGATOR = 'investigator',
  CONSISTENCY = 'consistency',
  ELITE = 'elite',
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum AchievementRequirement {
  TOTAL_XP = 'total_xp',
  LEVEL = 'level',
  CHALLENGES_COMPLETED = 'challenges_completed',
  LESSONS_COMPLETED = 'lessons_completed',
  STREAK = 'streak',
  ARCADE_PLAYS = 'arcade_plays',
  PERFECT_ARCADE_RUNS = 'perfect_arcade_runs',
}

@Entity()
export class Achievement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 80 })
  slug: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 500 })
  description: string;

  @Column({ type: 'enum', enum: AchievementCategory })
  category: AchievementCategory;

  @Column({ type: 'enum', enum: AchievementRarity })
  rarity: AchievementRarity;

  @Column({ type: 'enum', enum: AchievementRequirement })
  requirement_type: AchievementRequirement;

  @Column({ type: 'int' })
  requirement_value: number;

  @Column({ type: 'int', default: 1 })
  tier: number;

  @Column({ length: 60 })
  icon: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  image_url: string | null;

  @Column({ type: 'int', default: 1 })
  reward_prestige: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  prerequisite_slug: string | null;

  @Column({ type: 'int', default: 0 })
  position_x: number;

  @Column({ type: 'int', default: 0 })
  position_y: number;

  @Column({ type: 'int', default: 0 })
  order_index: number;

  @Column({ default: false })
  secret: boolean;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
