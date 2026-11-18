import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { AdminAuditService } from '../admin/admin-audit.service';
import { NotificationService } from '../notification/notification.service';
import { Usuario } from '../usuario/usuario.entity';
import { Turma } from './entities/turma.entity';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TURMA_NAO_ENCONTRADA } from './turma-acesso.service';
import { EnviarAvisoDto } from './dto/enviar-aviso.dto';

const LINK_AVISO = '/inicio';

/** Aviso manual da gestão para os alunos ativos de uma turma da escola. */
@Injectable()
export class TurmaAvisosService {
  constructor(
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
    private readonly notificacoes: NotificationService,
    private readonly audit: AdminAuditService,
  ) {}

  async enviar(
    atorId: number,
    empresaId: number,
    turmaId: number,
    dto: EnviarAvisoDto,
  ): Promise<{ enviados: number }> {
    const turma = await this.dataSource
      .getRepository(Turma)
      .findOne({ where: { id: turmaId, empresa_id: empresaId } });
    if (!turma) throw new NotFoundException(TURMA_NAO_ENCONTRADA);
    if (!turma.ativa) throw new ConflictException('Turma arquivada');

    const alunos = await this.dataSource
      .getRepository(Usuario)
      .createQueryBuilder('usuario')
      .select('usuario.id', 'id')
      .innerJoin(
        TurmaAluno,
        'turma_aluno',
        'turma_aluno.usuario_id = usuario.id AND turma_aluno.turma_id = :turmaId',
        { turmaId: turma.id },
      )
      .where('usuario.role = :role', { role: Role.USER })
      .andWhere('usuario.active = 1')
      .andWhere('usuario.empresa_id = :empresaId', { empresaId })
      .getRawMany<{ id: number }>();

    if (alunos.length) {
      await this.notificacoes.notify(
        alunos.map(({ id }) => ({
          usuarioId: Number(id),
          type: 'aviso' as const,
          title: dto.title,
          message: dto.message,
          link: LINK_AVISO,
        })),
      );
    }
    await this.audit.registrar({
      empresaId,
      atorId,
      acao: 'turma.aviso_enviado',
      alvoTipo: 'turma',
      alvoId: turma.id,
      detalhes: {
        destinatarios: alunos.length,
        titulo_tamanho: dto.title.length,
        mensagem_tamanho: dto.message.length,
      },
    });
    return { enviados: alunos.length };
  }
}
