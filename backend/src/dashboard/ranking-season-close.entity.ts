import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ranking_season_close')
export class RankingSeasonClose {
  @PrimaryColumn({ type: 'varchar', length: 7 })
  season_id: string;

  @Column({ type: 'datetime', precision: 6 })
  closed_at: Date;
}
