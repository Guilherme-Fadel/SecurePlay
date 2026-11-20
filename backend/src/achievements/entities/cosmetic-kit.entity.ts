import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { UnlockRule } from '../unlock-rule';
import { CosmeticItem } from './cosmetic-item.entity';
import { CosmeticRarity } from './cosmetic-rarity';

@Entity()
export class CosmeticKit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  @Index('ux_cosmetic_kit_slug', { unique: true })
  slug: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 400 })
  description: string;

  @Column({ type: 'enum', enum: CosmeticRarity })
  rarity: CosmeticRarity;

  @Column({ type: 'int' })
  price: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  festive_event: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  available_from: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  available_until: Date | null;

  @Column({ type: 'json', nullable: true })
  unlock_rule: UnlockRule | null;

  @Column({ default: false })
  active: boolean;

  @OneToMany(() => CosmeticItem, (item) => item.kit)
  pieces: CosmeticItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
