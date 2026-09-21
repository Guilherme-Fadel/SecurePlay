import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) {}

  async registrar(evento: {
    empresaId: number;
    atorId: number;
    acao: string;
    alvoTipo: string;
    alvoId?: number | null;
    detalhes?: Record<string, unknown> | null;
  }) {
    try {
      await this.dataSource.getRepository(AdminAuditEvent).save({
        empresa_id: evento.empresaId,
        ator_id: evento.atorId,
        acao: evento.acao,
        alvo_tipo: evento.alvoTipo,
        alvo_id: evento.alvoId ?? null,
        detalhes: evento.detalhes ?? null,
      });
    } catch (error) {
      this.logger.error('Falha ao registrar evento administrativo', error);
    }
  }

  async listarDaEmpresa(empresaId: number, page = 1, pageSize = 25) {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.min(100, Math.max(10, Math.floor(pageSize)));
    const [eventos, total] = await this.dataSource.getRepository(AdminAuditEvent).findAndCount({
      where: { empresa_id: empresaId }, relations: ['ator'], order: { created_at: 'DESC', id: 'DESC' },
      skip: (safePage - 1) * safePageSize, take: safePageSize,
    });
    return {
      items: eventos.map((evento) => ({
        id: evento.id, acao: evento.acao, alvo_tipo: evento.alvo_tipo, alvo_id: evento.alvo_id,
        detalhes: evento.detalhes, created_at: evento.created_at,
        ator: evento.ator ? { id: evento.ator.id, name: evento.ator.name, email: evento.ator.email } : null,
      })),
      page: safePage, pageSize: safePageSize, total, totalPages: Math.ceil(total / safePageSize),
    };
  }
}
