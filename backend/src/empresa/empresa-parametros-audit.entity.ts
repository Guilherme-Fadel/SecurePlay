import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { CompanyParameters } from '../config/features';
import { Usuario } from '../usuario/usuario.entity';

@Entity('empresa_parametros_audit')
@Index('ix_empresa_parametros_empresa_data', ['empresa_id', 'created_at'])
export class EmpresaParametrosAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @Column()
  alterado_por_id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'alterado_por_id' })
  alterado_por: Usuario | null;

  @Column({ type: 'json' })
  anterior: CompanyParameters;

  @Column({ type: 'json' })
  atual: CompanyParameters;

  @CreateDateColumn()
  created_at: Date;
}
