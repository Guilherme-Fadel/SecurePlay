import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../auth/roles.enum';

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

  @Column({default: 1})
  level: number

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: Role;
}
