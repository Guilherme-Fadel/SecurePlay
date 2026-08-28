import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { Empresa } from '../empresa/empresa.entity';

@Entity()
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: Role;

  @Column({ nullable: true })
  empresa_id: number;

  @ManyToOne(() => Empresa, { nullable: true })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;
}
