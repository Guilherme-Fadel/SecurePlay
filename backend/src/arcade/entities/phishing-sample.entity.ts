import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
export enum PhishingKind {
  EMAIL = 'email',
  SITE = 'site',
  MESSAGE = 'message',
}
export enum PhishingDifficulty {
  INICIANTE = 'iniciante',
  INTERMEDIARIO = 'intermediario',
  AVANCADO = 'avancado',
}
@Entity()
export class PhishingSample {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'enum', enum: PhishingKind, default: PhishingKind.EMAIL })
  kind: PhishingKind;
  @Column('json')
  content: Record<string, unknown>;
  @Column()
  is_phishing: boolean;
  @Column('json')
  signals: string[];
  @Column({ length: 500 })
  explanation: string;
  @Column({
    type: 'enum',
    enum: PhishingDifficulty,
    default: PhishingDifficulty.INICIANTE,
  })
  difficulty: PhishingDifficulty;
  @Column({ default: true })
  active: boolean;
}
