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

/**
 * Amostra do jogo Caca ao Phishing. O conteudo (content) e apresentado ao jogador;
 * is_phishing e signals sao GABARITO e nunca vao para o cliente na listagem/partida.
 */
@Entity()
export class PhishingSample {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: PhishingKind, default: PhishingKind.EMAIL })
  kind: PhishingKind;

  // conteudo exibido: { sender?, subject?, body, url? } conforme o kind. Sem gabarito.
  @Column('json')
  content: Record<string, unknown>;

  // gabarito: e golpe?
  @Column()
  is_phishing: boolean;

  // gabarito: chaves dos sinais suspeitos corretos (ex.: ['sender','url','urgency']).
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
