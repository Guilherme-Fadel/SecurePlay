import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('ranking_tracking')
export class RankingTracking {
  @PrimaryColumn({ type: 'tinyint' })
  id: number;

  @Column({ type: 'datetime', precision: 6, nullable: true })
  start_local_at: Date | null;
}
