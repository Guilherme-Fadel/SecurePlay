import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresa/empresa.entity';
import { Usuario } from '../../usuario/usuario.entity';
import { Role } from '../../auth/roles.enum';

@Entity()
export class Convite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64, unique: true })
  token_hash: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column()
  empresa_id: number;

  @ManyToOne(() => Empresa, { nullable: false })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @Column()
  criado_por_id: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'criado_por_id' })
  criado_por: Usuario;

  @Column({ type: 'datetime' })
  expires_at: Date;

  @Column({ default: 1 })
  max_uses: number;

  @Column({ type: 'varchar', length: 32, default: Role.USER })
  role: Role;

  @Column({ default: 0 })
  uses: number;

  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
