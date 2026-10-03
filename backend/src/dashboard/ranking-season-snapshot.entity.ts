import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('ranking_season_snapshot')
@Index('idx_ranking_snapshot_company', ['season_id', 'empresa_id', 'points'])
@Index('idx_ranking_snapshot_global', [
  'season_id',
  'global_eligible',
  'points',
])
export class RankingSeasonSnapshot {
  @PrimaryColumn({ type: 'varchar', length: 7 })
  season_id: string;

  @PrimaryColumn({ type: 'int' })
  usuario_id: number;

  @Column({ type: 'int' })
  points: number;

  @Column({ type: 'int' })
  total_points: number;

  @Column({ type: 'varchar', length: 100 })
  display_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profile_image_key: string | null;

  @Column({ type: 'int', nullable: true })
  empresa_id: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  empresa_nome: string | null;

  @Column({ type: 'boolean' })
  global_eligible: boolean;
}
