import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

@Entity()
@Index('ix_notification_usuario_created', ['usuario_id', 'created_at'])
@Index('ix_notification_usuario_read_created', [
  'usuario_id',
  'readed',
  'created_at',
])
@Index('ix_notification_group_key', ['group_key'])
@Index('uq_notification_usuario_group', ['usuario_id', 'group_key'], {
  unique: true,
})
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column()
  usuario_id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 250 })
  message: string;

  @Column({ length: 100 })
  type: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  link: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  group_key: string | null;

  @Column({ default: false })
  readed: boolean;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
