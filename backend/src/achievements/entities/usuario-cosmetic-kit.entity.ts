import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';
import { CosmeticKit } from './cosmetic-kit.entity';

@Entity()
@Unique('ux_usuario_cosmetic_kit_usuario_kit', ['usuario_id', 'kit_id'])
@Index('ix_usuario_cosmetic_kit_kit', ['kit_id'])
export class UsuarioCosmeticKit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'fk_usuario_cosmetic_kit_usuario',
  })
  usuario: Usuario;

  @Column()
  usuario_id: number;

  @ManyToOne(() => CosmeticKit)
  @JoinColumn({
    name: 'kit_id',
    foreignKeyConstraintName: 'fk_usuario_cosmetic_kit_kit',
  })
  kit: CosmeticKit;

  @Column()
  kit_id: number;

  @CreateDateColumn()
  purchased_at: Date;
}
