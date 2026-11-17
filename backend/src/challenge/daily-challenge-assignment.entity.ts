import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Desafio do dia de cada aluno, durável em SQL (M6). O Redis vira só cache: se ele for
 * limpo, o aluno continua com o mesmo desafio e não ganha um segundo no mesmo dia.
 */
@Entity({ name: 'daily_challenge_assignment' })
export class DailyChallengeAssignment {
  @PrimaryColumn() usuario_id: number;

  /** Dia no fuso de São Paulo (AAAA-MM-DD), como getLocalDateKey(). */
  @PrimaryColumn({ type: 'varchar', length: 10 }) day: string;

  @Column() challenge_id: number;

  @Column({
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at: Date;
}
