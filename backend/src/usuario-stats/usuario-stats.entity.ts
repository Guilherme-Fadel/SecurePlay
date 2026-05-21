import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

@Entity()
export class UsuarioStats {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ unique: true })
  usuario_id: number;

  @Column({ default: 0 })
  total_points: number;

  @Column({ default: 0 })
  current_streak: number;

  @Column({ type: 'date', nullable: true })
  last_checkin_date: string | null;

  @UpdateDateColumn()
  updated_at: Date;
}
