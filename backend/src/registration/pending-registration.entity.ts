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

  @Column({ type: 'date', nullable: true })
  birth_date: string | null;

  // Desired username, claimed only when the email is confirmed.
  @Column({
    type: 'varchar',
    length: 24,
    nullable: true,
    charset: 'ascii',
    collation: 'ascii_general_ci',
  })
  username: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  phone: string | null;

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
