import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';

@Entity({ name: 'arcade_daily_plays', synchronize: false })
export class ArcadeDailyPlays {
  @PrimaryColumn() usuario_id: number;
  @PrimaryColumn({ type: 'varchar', length: 80 }) game_slug: string;
  @PrimaryColumn({ type: 'date' }) day: string;
  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'fk_arcade_daily_usuario',
  })
  usuario: Usuario;
  @Column({ default: 0 }) plays: number;
}
