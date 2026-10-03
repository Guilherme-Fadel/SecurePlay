import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

@Entity('ranking_season_points')
export class RankingSeasonPoints {
  @PrimaryColumn({ type: 'varchar', length: 7 })
  season_id: string;

  @PrimaryColumn({ type: 'int' })
  usuario_id: number;

  @ManyToOne(() => Usuario, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'fk_ranking_season_points_usuario',
  })
  usuario: Usuario;

  @Column({ type: 'int', default: 0 })
  points: number;
}
