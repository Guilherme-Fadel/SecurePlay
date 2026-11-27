import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { UnlockRule } from '../unlock-rule';
import { CosmeticKit } from './cosmetic-kit.entity';
import { CosmeticRarity } from './cosmetic-rarity';

export { CosmeticRarity };

/**
 * `frame`, `title` e `badge` são LEGADOS: o produto os descontinuou (ver
 * `retired-types.ts`). Ficam aqui só para ler linhas e posses antigas do banco;
 * não crie, venda nem equipe itens desses tipos.
 */
export enum CosmeticType {
  FRAME = 'frame',
  BACKGROUND = 'background',
  TITLE = 'title',
  BADGE = 'badge',
  EFFECT = 'effect',
  SKIN = 'skin',
  HEAD = 'head',
  FACE = 'face',
  NECK = 'neck',
  CARD = 'card',
}

export type CosmeticLayer = 'back' | 'front';

/** MySQL devolve DECIMAL como string; o domínio trabalha com number. */
const decimalAsNumber = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) =>
    value === null || value === undefined ? value : Number(value),
};

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

  @Column({ type: 'enum', enum: CosmeticRarity })
  rarity: CosmeticRarity;

  @Column({ type: 'int' })
  price: number;

  @Column({ length: 160 })
  visual_value: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  required_achievement_slug: string | null;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => CosmeticKit, (kit) => kit.pieces, { nullable: true })
  @JoinColumn({
    name: 'kit_id',
    foreignKeyConstraintName: 'fk_cosmetic_item_kit',
  })
  kit: CosmeticKit | null;

  @Column({ type: 'int', nullable: true })
  kit_id: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  festive_event: string | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  available_from: Date | null;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  available_until: Date | null;

  @Column({ type: 'json', nullable: true })
  unlock_rule: UnlockRule | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  art_key: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  art_mime: string | null;

  @Column({ type: 'enum', enum: ['back', 'front'], default: 'front' })
  layer: CosmeticLayer;

  @Column({ type: 'boolean', default: false })
  recolorable: boolean;

  // O MySQL guarda o padrão de decimal já com a escala ('0.00'); número aqui faria o
  // synchronize ver diferença a cada subida. Igual ao DEFAULT da migração, na mesma escala.
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: '0.00',
    transformer: decimalAsNumber,
  })
  adjust_x: number;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: '0.00',
    transformer: decimalAsNumber,
  })
  adjust_y: number;

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    default: '1.00',
    transformer: decimalAsNumber,
  })
  adjust_scale: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
