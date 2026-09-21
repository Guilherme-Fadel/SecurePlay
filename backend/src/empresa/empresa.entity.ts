import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { CompanyParameters } from '../config/features';

@Entity()
export class Empresa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nome: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  @Index('ux_empresa_system_key', { unique: true })
  system_key: string | null;

  @Column({ type: 'json', nullable: true })
  parametros_funcionalidades: CompanyParameters | null;

  @Column({ length: 500, nullable: true })
  logo_url: string;

  @Column({ type: 'json', nullable: true })
  paleta: {
    primary: string;
    secondary: string;
    accent: string;
    text_primary: string;
    text_secondary: string;
  } | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
