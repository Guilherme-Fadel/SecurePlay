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

  @CreateDateColumn()
  purchased_at: Date;
}
