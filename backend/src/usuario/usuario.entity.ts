import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Role } from '../auth/roles.enum';
import { Empresa } from '../empresa/empresa.entity';

@Entity()
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 24, nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  nickname_pending: string | null;

  @Column({ type: 'varchar', length: 20, default: 'none' })
  nickname_request_status: 'none' | 'pending' | 'approved' | 'rejected';

  @Column({ type: 'varchar', length: 255, nullable: true })
  profile_image_key: string | null;

  @Column({ length: 100 })
  @Index('ux_usuario_email', { unique: true })
  email: string;

  @Column({ type: 'date', nullable: true })
  birth_date: string | null;

  @Column({ type: 'datetime', nullable: true })
  email_verified_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  trial_started_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  trial_ends_at: Date | null;

  @Column({ length: 255 })
  password: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: Role;

  @Column({ nullable: true })
  empresa_id: number;

  @ManyToOne(() => Empresa, { nullable: true })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;
}
