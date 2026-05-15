import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

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

  @UpdateDateColumn()
  updated_at: Date;
}
