import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';

@Entity('admin_audit_event')
@Index('ix_admin_audit_event_empresa_created', ['empresa_id', 'created_at'])
export class AdminAuditEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa_id: number;

  @Column()
  ator_id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'ator_id' })
  ator: Usuario | null;

  @Column({ length: 80 })
  acao: string;

  @Column({ length: 40 })
  alvo_tipo: string;

  @Column({ type: 'int', nullable: true })
  alvo_id: number | null;

  @Column({ type: 'json', nullable: true })
  detalhes: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at: Date;
}
