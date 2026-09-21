import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('pending_registration')
export class PendingRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  @Index('ux_pending_registration_token', { unique: true })
  token_hash: string;

  @Column({ type: 'varchar', length: 100 })
  @Index('ux_pending_registration_email', { unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'date' })
  birth_date: string;

  @Column({ type: 'varchar', length: 24, nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', length: 16 })
  kind: 'trial' | 'invite';

  @Column({ type: 'int', nullable: true })
  invite_id: number | null;

  @Column({ type: 'datetime' })
  expires_at: Date;

  @Column({ type: 'datetime', nullable: true })
  last_sent_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
