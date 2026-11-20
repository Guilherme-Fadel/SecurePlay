import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';
import { CosmeticItem } from './cosmetic-item.entity';
import { CosmeticKit } from './cosmetic-kit.entity';

@Entity()
@Unique('UQ_usuario_cosmetic_usuario_item', ['usuario_id', 'cosmetic_item_id'])
export class UsuarioCosmetic {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  usuario_id: number;

  @ManyToOne(() => CosmeticItem)
  @JoinColumn({ name: 'cosmetic_item_id' })
  cosmetic_item: CosmeticItem;

  @Column()
  cosmetic_item_id: number;

  @Column({ default: false })
  equipped: boolean;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @ManyToOne(() => CosmeticKit, { nullable: true })
  @JoinColumn({
    name: 'acquired_kit_id',
    foreignKeyConstraintName: 'fk_usuario_cosmetic_acquired_kit',
  })
  acquired_kit: CosmeticKit | null;

  @Column({ type: 'int', nullable: true })
  acquired_kit_id: number | null;

  @CreateDateColumn()
  purchased_at: Date;
}
