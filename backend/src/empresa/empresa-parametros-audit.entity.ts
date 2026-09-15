import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { CompanyParameters } from '../config/features';

@Entity('empresa_parametros_audit')
@Index('ix_empresa_parametros_empresa_data', ['empresa_id', 'created_at'])
export class EmpresaParametrosAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @Column()
  alterado_por_id: number;

  @Column({ type: 'json' })
  anterior: CompanyParameters;

  @Column({ type: 'json' })
  atual: CompanyParameters;

  @CreateDateColumn()
  created_at: Date;
}
