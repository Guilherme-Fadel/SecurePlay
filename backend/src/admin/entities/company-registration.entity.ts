import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empresa } from '../../empresa/empresa.entity';

@Entity('company_registration')
@Index('ux_company_registration_unit', ['cnpj', 'unidade'], { unique: true })
export class CompanyRegistration {
  @PrimaryColumn() empresa_id: number;
  @OneToOne(() => Empresa, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;
  @Column({ type: 'varchar', length: 180, nullable: true }) razao_social:
    | string
    | null;
  @Column({
    type: 'varchar',
    length: 14,
    nullable: true,
    charset: 'ascii',
    collation: 'ascii_general_ci',
  })
  cnpj: string | null;
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
  })
  unidade: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) contato_nome:
    | string
    | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) contato_email:
    | string
    | null;
  @Column({ type: 'varchar', length: 16, nullable: true }) contato_telefone:
    | string
    | null;
  @Column({ type: 'varchar', length: 8, nullable: true }) cep: string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) logradouro:
    | string
    | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) numero:
    | string
    | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) complemento:
    | string
    | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) bairro:
    | string
    | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) cidade:
    | string
    | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) uf: string | null;
  @UpdateDateColumn() updated_at: Date;
}
