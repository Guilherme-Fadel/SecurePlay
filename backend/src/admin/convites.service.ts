import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Empresa } from '../empresa/empresa.entity';
import { Role } from '../auth/roles.enum';
import { Usuario } from '../usuario/usuario.entity';
import { UsuarioAula } from '../conteudo/usuario-aula/usuario-aula.entity';
import { CompleteCadastroConviteDto } from './dto/complete-cadastro-convite.dto';
import { CreateConviteDto } from './dto/create-convite.dto';
import { Convite } from './entities/convite.entity';
import { RegistrationService } from '../registration/registration.service';
import { AdminAuditService } from './admin-audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ensurePendingRankingSeasonsClosed } from '../dashboard/ranking-history';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

type ConviteFiltros = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: 'asc' | 'desc';
};

type UsuarioFiltros = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'management';
  sort?: 'asc' | 'desc';
};

@Injectable()
export class ConvitesService {
  constructor(
    @Inject('CONVITE_REPOSITORY')
    private readonly conviteRepository: Repository<Convite>,
    @Inject('USUARIO_REPOSITORY')
    private readonly usuarioRepository: Repository<Usuario>,
    @Inject('EMPRESA_REPOSITORY')
    private readonly empresaRepository: Repository<Empresa>,
    private readonly registrationService: RegistrationService,
    private readonly adminAuditService: AdminAuditService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
  ) {}

  async listarUsuarios(userId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.listarUsuariosDaEmpresa(empresa.id);
  }

  async obterUsuario(userId: number, usuarioId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.obterUsuarioDaEmpresa(empresa.id, usuarioId);
  }

  async obterUsuarioDaEmpresa(empresaId: number, usuarioId: number) {
    return this.toUsuarioResumo(
      await this.getUsuarioDaEmpresa(empresaId, usuarioId),
    );
  }

  async obterPropriosDadosPlataforma(atorId: number, usuarioId: number) {
    const actor = await this.usuarioRepository.findOne({
      where: { id: atorId },
    });
    if (actor?.role !== Role.PLATFORM_ADMIN || atorId !== usuarioId)
      throw new ForbiddenException('Acesso indisponível');
    return this.toUsuarioResumo(actor);
  }

  async atualizarUsuario(
    atorId: number,
    usuarioId: number,
    dto: UpdateAdminUserDto,
    empresaId?: number,
  ) {
    const actor = await this.usuarioRepository.findOne({
      where: { id: atorId },
    });
    if (
      !actor ||
      !actor.active ||
      ![Role.ADMIN, Role.PLATFORM_ADMIN].includes(actor.role)
    )
      throw new ForbiddenException('Acesso indisponível');
    const platform = actor.role === Role.PLATFORM_ADMIN;
    const scope = platform ? empresaId : actor.empresa_id;
    if (
      !platform &&
      (!scope || (empresaId !== undefined && empresaId !== scope))
    )
      throw new ForbiddenException('Empresa inválida');
    if (!platform && atorId === usuarioId)
      throw new ForbiddenException(
        'Somente o administrador da plataforma pode editar os próprios dados',
      );
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        if (
          scope &&
          !(await manager.findOne(Empresa, {
            where: { id: scope },
            lock: { mode: 'pessimistic_write' },
          }))
        )
          throw new NotFoundException('Empresa não encontrada');
        const target = await manager.findOne(Usuario, {
          where: scope
            ? { id: usuarioId, empresa_id: scope }
            : { id: usuarioId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!target)
          throw new NotFoundException('Usuário não encontrado nesta empresa');
        if (
          target.role === Role.PLATFORM_ADMIN &&
          (!platform || target.id !== atorId)
        )
          throw new ForbiddenException(
            'Esta conta só pode ser editada pelo próprio administrador da plataforma',
          );
        if (dto.role && target.role === Role.PLATFORM_ADMIN)
          throw new BadRequestException(
            'O perfil da plataforma não pode ser alterado',
          );
        const email =
          dto.email === undefined
            ? target.email
            : (dto.email?.trim().toLowerCase() ?? null);
        const nextRole = dto.role ?? target.role;
        if (nextRole !== Role.USER && !email)
          throw new BadRequestException(
            'Contas administrativas precisam de e-mail',
          );
        if (dto.role === Role.ADMIN && target.login_code)
          throw new BadRequestException(
            'Use um convite de administrador para contas com código escolar',
          );
        if (email !== target.email && target.password_change_required)
          throw new BadRequestException(
            'Conclua a definição de senha antes de alterar o e-mail',
          );
        if (
          dto.role === Role.USER &&
          target.role === Role.ADMIN &&
          target.active &&
          (await manager.count(Usuario, {
            where: {
              empresa_id: target.empresa_id,
              role: Role.ADMIN,
              active: true,
            },
          })) <= 1
        )
          throw new BadRequestException(
            'A empresa precisa manter ao menos um administrador ativo',
          );
        const fields: string[] = [];
        if (dto.name !== undefined) {
          const name = dto.name.trim();
          if (name.length < 2)
            throw new BadRequestException('Informe um nome válido');
          target.name = name;
          fields.push('name');
        }
        if (dto.email !== undefined && email !== target.email) {
          if (!email && !target.login_code)
            throw new BadRequestException('Este acesso exige um e-mail');
          target.email = email;
          target.email_verified_at = null;
          target.email_verification_token_hash = null;
          target.email_verification_expires_at = null;
          target.password_reset_token_hash = null;
          target.password_reset_expires_at = null;
          target.password_setup_token_hash = null;
          target.password_setup_expires_at = null;
          fields.push('email');
        }
        if (dto.nickname !== undefined) {
          target.nickname = dto.nickname?.trim() || null;
          target.nickname_pending = null;
          target.nickname_request_status = 'none';
          fields.push('nickname');
        }
        if (dto.level !== undefined) {
          target.level = dto.level;
          fields.push('level');
        }
        if (dto.role && (dto.role as Role) !== target.role) {
          target.role = dto.role as Role;
          fields.push('role');
        }
        if (!fields.length) return this.toUsuarioResumo(target);
        if (fields.includes('email') || fields.includes('role'))
          target.session_version = (target.session_version ?? 0) + 1;
        await manager.save(Usuario, target);
        if (target.empresa_id)
          await manager.save(AdminAuditEvent, {
            empresa_id: target.empresa_id,
            ator_id: atorId,
            acao: 'usuario.atualizado',
            alvo_tipo: 'usuario',
            alvo_id: target.id,
            detalhes: { campos: fields },
          });
        return this.toUsuarioResumo(target);
      });
      return result;
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY')
        throw new ConflictException('O e-mail já está em uso');
      throw error;
    }
  }

  async listarUsuariosDaEmpresa(empresaId: number) {
    const usuarios = await this.usuarioRepository.find({
      where: { empresa_id: empresaId },
      order: { name: 'ASC' },
    });

    return usuarios.map((usuario) => this.toUsuarioResumo(usuario));
  }

  async listarUsuariosPaginados(userId: number, filtros: UsuarioFiltros) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.listarUsuariosPaginadosDaEmpresa(empresa.id, filtros);
  }

  async listarUsuariosPaginadosDaEmpresa(
    empresaId: number,
    filtros: UsuarioFiltros,
  ) {
    const { page, pageSize, search } = this.normalizarFiltrosPaginados(filtros);
    const query = this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('usuario.empresa_id = :empresaId', { empresaId });

    if (filtros.status === 'active') {
      query.andWhere('usuario.active = :active', { active: true });
    } else if (filtros.status === 'inactive') {
      query.andWhere('usuario.active = :active', { active: false });
    } else if (filtros.status === 'management') {
      query.andWhere('usuario.role IN (:...roles)', {
        roles: [Role.ADMIN, Role.PLATFORM_ADMIN],
      });
    }

    if (search) {
      query.andWhere(
        '(usuario.name LIKE :search OR usuario.email LIKE :search OR usuario.nickname LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const direction = filtros.sort === 'desc' ? 'DESC' : 'ASC';
    const [usuarios, total] = await query
      .orderBy('usuario.name', direction)
      .addOrderBy('usuario.id', direction)
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: usuarios.map((usuario) => this.toUsuarioResumo(usuario)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async obterResumoAdministrativo(userId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.obterResumoAdministrativoDaEmpresa(empresa.id);
  }

  async obterResumoAdministrativoDaEmpresa(empresaId: number) {
    const usuariosAtivos = await this.usuarioRepository.count({
      where: { empresa_id: empresaId, active: true },
    });
    const alunosAtivos = await this.usuarioRepository.count({
      where: { empresa_id: empresaId, role: Role.USER, active: true },
    });
    const usuariosInativos = await this.usuarioRepository.count({
      where: { empresa_id: empresaId, active: false },
    });
    const apelidosPendentes = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('usuario.empresa_id = :empresaId', { empresaId })
      .andWhere('usuario.role = :role', { role: Role.USER })
      .andWhere('usuario.nickname_request_status = :status', {
        status: 'pending',
      })
      .andWhere('usuario.nickname_pending IS NOT NULL')
      .getCount();
    const convitesAtivos = await this.conviteRepository
      .createQueryBuilder('convite')
      .where('convite.empresa_id = :empresaId', { empresaId })
      .andWhere('convite.revoked = :revoked', { revoked: false })
      .andWhere('convite.expires_at > :now', { now: new Date() })
      .andWhere('convite.uses < convite.max_uses')
      .getCount();
    const participacao = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(DISTINCT usuarioAula.usuario_id)', 'total')
      .from(UsuarioAula, 'usuarioAula')
      .innerJoin(Usuario, 'usuario', 'usuario.id = usuarioAula.usuario_id')
      .where('usuario.empresa_id = :empresaId', { empresaId })
      .andWhere('usuario.role = :role', { role: Role.USER })
      .andWhere('usuario.active = :active', { active: true })
      .andWhere('usuarioAula.completed = :completed', { completed: true })
      .getRawOne<{ total: string | number }>();

    return {
      usuariosAtivos,
      alunosAtivos,
      usuariosInativos,
      apelidosPendentes,
      convitesAtivos,
      alunosComAulaConcluida: Number(participacao?.total ?? 0),
    };
  }

  async listarApelidosPendentes(
    userId: number,
    filtros: {
      page?: number;
      pageSize?: number;
      search?: string;
      sort?: 'default' | 'asc' | 'desc';
    },
  ) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.listarApelidosPendentesDaEmpresa(empresa.id, filtros);
  }

  async listarApelidosPendentesDaEmpresa(
    empresaId: number,
    filtros: {
      page?: number;
      pageSize?: number;
      search?: string;
      sort?: 'default' | 'asc' | 'desc';
    },
  ) {
    const { page, pageSize, search } = this.normalizarFiltrosPaginados(filtros);
    const query = this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('usuario.empresa_id = :empresaId', { empresaId })
      .andWhere('usuario.role = :role', { role: Role.USER })
      .andWhere('usuario.nickname_request_status = :status', {
        status: 'pending',
      })
      .andWhere('usuario.nickname_pending IS NOT NULL');

    if (search) {
      query.andWhere(
        '(usuario.name LIKE :search OR usuario.email LIKE :search OR usuario.nickname_pending LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const nicknameSort = filtros.sort === 'asc' || filtros.sort === 'desc';
    query.orderBy(
      nicknameSort ? 'usuario.nickname_pending' : 'usuario.id',
      filtros.sort === 'asc' ? 'ASC' : 'DESC',
    );
    if (nicknameSort) query.addOrderBy('usuario.id', 'ASC');
    const [usuarios, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: usuarios.map((usuario) => this.toUsuarioResumo(usuario)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async criar(userId: number, dto: CreateConviteDto) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.criarParaEmpresa(empresa.id, userId, dto);
  }

  async criarParaEmpresa(
    empresaId: number,
    userId: number,
    dto: CreateConviteDto,
    role: Role = Role.USER,
  ) {
    const empresa = await this.getEmpresa(empresaId);
    if (empresa.system_key === 'free_trial') {
      throw new BadRequestException(
        'A empresa do teste gratuito não aceita convites',
      );
    }
    const email = dto.email?.trim().toLowerCase() || null;
    const roleDoConvite = role === Role.ADMIN ? Role.ADMIN : Role.USER;
    const registrationMode =
      roleDoConvite === Role.USER && dto.registration_mode === 'school_student'
        ? 'school_student'
        : 'legacy_email';

    if (registrationMode === 'school_student' && email) {
      throw new BadRequestException(
        'Convites escolares mínimos não devem armazenar e-mail do aluno',
      );
    }

    if (roleDoConvite === Role.ADMIN && !email) {
      throw new BadRequestException(
        'Convites de administrador exigem um e-mail',
      );
    }

    if (email && (await this.usuarioRepository.findOne({ where: { email } }))) {
      throw new BadRequestException(
        'Este e-mail já possui um acesso cadastrado',
      );
    }

    const token = randomBytes(32).toString('base64url');
    const validadeDias = dto.validade_dias ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validadeDias);

    const convite = this.conviteRepository.create({
      token_hash: this.hashToken(token),
      email,
      empresa_id: empresaId,
      criado_por_id: userId,
      expires_at: expiresAt,
      max_uses:
        roleDoConvite === Role.ADMIN || registrationMode === 'school_student'
          ? 1
          : (dto.max_uses ?? 1),
      role: roleDoConvite,
      registration_mode: registrationMode,
    });
    const saved = await this.conviteRepository.save(convite);
    await this.adminAuditService.registrar({
      empresaId,
      atorId: userId,
      acao: 'convite.criado',
      alvoTipo: 'convite',
      alvoId: saved.id,
      detalhes: { email: saved.email, role: saved.role },
    });

    return {
      convite: this.toResumo(saved),
      token,
    };
  }

  async listar(userId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.listarDaEmpresa(empresa.id);
  }

  async listarDaEmpresa(empresaId: number) {
    const convites = await this.conviteRepository.find({
      where: { empresa_id: empresaId },
      order: { created_at: 'DESC' },
    });
    return convites.map((convite) => this.toResumo(convite));
  }

  async listarPaginados(userId: number, filtros: ConviteFiltros) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.listarPaginadosDaEmpresa(empresa.id, filtros);
  }

  async listarPaginadosDaEmpresa(empresaId: number, filtros: ConviteFiltros) {
    const { page, pageSize, search } = this.normalizarFiltrosPaginados(filtros);
    const direction = filtros.sort === 'asc' ? 'ASC' : 'DESC';
    const query = this.conviteRepository
      .createQueryBuilder('convite')
      .where('convite.empresa_id = :empresaId', { empresaId });
    if (search)
      query.andWhere('convite.email LIKE :search', { search: `%${search}%` });
    const [convites, total] = await query
      .orderBy('convite.created_at', direction)
      .addOrderBy('convite.id', direction)
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return {
      items: convites.map((convite) => this.toResumo(convite)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async revogar(userId: number, conviteId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.revogarDaEmpresa(empresa.id, conviteId, userId);
  }

  async revogarDaEmpresa(
    empresaId: number,
    conviteId: number,
    atorId?: number,
  ) {
    const convite = await this.conviteRepository.findOne({
      where: { id: conviteId, empresa_id: empresaId },
    });
    if (!convite) throw new NotFoundException('Convite não encontrado');

    convite.revoked = true;
    await this.conviteRepository.save(convite);
    if (atorId)
      await this.adminAuditService.registrar({
        empresaId,
        atorId,
        acao: 'convite.revogado',
        alvoTipo: 'convite',
        alvoId: convite.id,
        detalhes: { email: convite.email },
      });
    return this.toResumo(convite);
  }

  async consultarPublico(token: string) {
    const convite = await this.getConviteValido(token, true);
    return {
      empresa_nome: convite.empresa.nome,
      email: convite.email,
      role: convite.role,
      registration_mode: convite.registration_mode ?? 'legacy_email',
      expires_at: convite.expires_at,
    };
  }

  async completarCadastro(token: string, dto: CompleteCadastroConviteDto) {
    return this.registrationService.startInvite(token, dto);
  }

  async aprovarApelido(userId: number, usuarioId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.aprovarApelidoDaEmpresa(empresa.id, usuarioId, userId);
  }

  async aprovarApelidoDaEmpresa(
    empresaId: number,
    usuarioId: number,
    atorId?: number,
  ) {
    const usuario = await this.getUsuarioDaEmpresa(empresaId, usuarioId);
    if (usuario.role !== Role.USER) {
      throw new BadRequestException(
        'Usuários de gerência não podem ter apelidos no ranking',
      );
    }
    if (!usuario.nickname_pending) {
      throw new BadRequestException('Não há apelido pendente para aprovar');
    }

    const apelido = usuario.nickname_pending;
    await ensurePendingRankingSeasonsClosed(
      this.usuarioRepository.manager.connection,
    );
    usuario.nickname = apelido;
    usuario.nickname_pending = null;
    usuario.nickname_request_status = 'approved';
    await this.usuarioRepository.save(usuario);
    if (atorId)
      await this.adminAuditService.registrar({
        empresaId,
        atorId,
        acao: 'apelido.aprovado',
        alvoTipo: 'usuario',
        alvoId: usuario.id,
        detalhes: { apelido },
      });
    return this.toUsuarioResumo(usuario);
  }

  async rejeitarApelido(userId: number, usuarioId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.rejeitarApelidoDaEmpresa(empresa.id, usuarioId, userId);
  }

  async rejeitarApelidoDaEmpresa(
    empresaId: number,
    usuarioId: number,
    atorId?: number,
  ) {
    const usuario = await this.getUsuarioDaEmpresa(empresaId, usuarioId);
    if (usuario.role !== Role.USER) {
      throw new BadRequestException(
        'Usuários de gerência não podem ter apelidos no ranking',
      );
    }
    if (!usuario.nickname_pending) {
      throw new BadRequestException('Não há apelido pendente para rejeitar');
    }

    const apelido = usuario.nickname_pending;
    usuario.nickname_pending = null;
    usuario.nickname_request_status = 'rejected';
    await this.usuarioRepository.save(usuario);
    if (atorId)
      await this.adminAuditService.registrar({
        empresaId,
        atorId,
        acao: 'apelido.rejeitado',
        alvoTipo: 'usuario',
        alvoId: usuario.id,
        detalhes: { apelido },
      });
    return this.toUsuarioResumo(usuario);
  }

  async inativarUsuario(userId: number, usuarioId: number, motivo: string) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.inativarUsuarioDaEmpresa(empresa.id, userId, usuarioId, motivo);
  }

  async reativarUsuario(userId: number, usuarioId: number, motivo: string) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.reativarUsuarioDaEmpresa(empresa.id, userId, usuarioId, motivo);
  }

  async emitirLinkRedefinicaoAluno(atorId: number, usuarioId: number) {
    const empresa = await this.getEmpresaDoAdministrador(atorId);
    return this.dataSource.transaction(async (manager) => {
      const usuario = await manager.findOne(Usuario, {
        where: { id: usuarioId, empresa_id: empresa.id, role: Role.USER },
        lock: { mode: 'pessimistic_write' },
      });
      if (!usuario?.active || usuario.email !== null || !usuario.login_code) {
        throw new NotFoundException('Aluno não encontrado nesta escola');
      }

      const resetToken = randomBytes(32).toString('base64url');
      usuario.password_reset_token_hash = this.hashToken(resetToken);
      usuario.password_reset_expires_at = new Date(Date.now() + 20 * 60 * 1000);
      usuario.session_version = (usuario.session_version ?? 0) + 1;
      await manager.save(Usuario, usuario);
      await manager.save(AdminAuditEvent, {
        empresa_id: empresa.id,
        ator_id: atorId,
        acao: 'aluno.link_redefinicao_emitido',
        alvo_tipo: 'usuario',
        alvo_id: usuario.id,
        detalhes: { expira_em_minutos: 20 },
      });

      return {
        reset_token: resetToken,
        expires_at: usuario.password_reset_expires_at,
      };
    });
  }

  async inativarUsuarioDaEmpresa(
    empresaId: number,
    atorId: number,
    usuarioId: number,
    motivo: string,
  ) {
    return this.alterarAtivo(usuarioId, atorId, empresaId, false, motivo);
  }

  async reativarUsuarioDaEmpresa(
    empresaId: number,
    atorId: number,
    usuarioId: number,
    motivo: string,
  ) {
    return this.alterarAtivo(usuarioId, atorId, empresaId, true, motivo);
  }

  async inativarUsuarioGlobal(
    atorId: number,
    usuarioId: number,
    motivo: string,
  ) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return this.alterarAtivo(
      usuarioId,
      atorId,
      usuario.empresa_id,
      false,
      motivo,
    );
  }

  async reativarUsuarioGlobal(
    atorId: number,
    usuarioId: number,
    motivo: string,
  ) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    if (!usuario.empresa_id) {
      throw new BadRequestException(
        'Somente contas vinculadas a uma escola podem ser reativadas por aqui',
      );
    }
    return this.alterarAtivo(
      usuarioId,
      atorId,
      usuario.empresa_id,
      true,
      motivo,
    );
  }

  private async getEmpresaDoAdministrador(userId: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: userId },
    });
    if (!usuario?.empresa_id) {
      throw new NotFoundException(
        'Empresa não encontrada para este administrador',
      );
    }

    return this.getEmpresa(usuario.empresa_id);
  }

  private normalizarFiltrosPaginados(filtros: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    return {
      page: Number.isFinite(filtros.page)
        ? Math.max(1, Math.floor(filtros.page as number))
        : 1,
      pageSize: Number.isFinite(filtros.pageSize)
        ? Math.min(100, Math.max(1, Math.floor(filtros.pageSize as number)))
        : 25,
      search: filtros.search?.trim().slice(0, 100),
    };
  }

  private async getEmpresa(empresaId: number) {
    const empresa = await this.empresaRepository.findOne({
      where: { id: empresaId },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  private async getUsuarioDaEmpresa(empresaId: number, usuarioId: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId, empresa_id: empresaId },
    });
    if (!usuario)
      throw new NotFoundException('Usuário não encontrado nesta turma');
    return usuario;
  }

  private toUsuarioResumo(usuario: Usuario) {
    return {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      login_method: usuario.login_code ? 'school_code' : 'email',
      role: usuario.role,
      level: usuario.level,
      active: usuario.active,
      nickname: usuario.nickname,
      nickname_pending: usuario.nickname_pending,
      nickname_request_status: usuario.nickname_request_status,
    };
  }

  private async alterarAtivo(
    usuarioId: number,
    atorId: number,
    empresaId: number | null,
    active: boolean,
    motivo: string,
  ) {
    const motivoNormalizado = motivo?.trim();
    if (
      !motivoNormalizado ||
      motivoNormalizado.length < 5 ||
      motivoNormalizado.length > 300
    ) {
      throw new BadRequestException(
        'Informe um motivo entre 5 e 300 caracteres',
      );
    }

    const usuario = await this.dataSource.transaction(async (manager) => {
      if (empresaId) {
        const empresa = await manager.findOne(Empresa, {
          where: { id: empresaId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!empresa) throw new NotFoundException('Empresa não encontrada');
      }

      const target = await manager.findOne(Usuario, {
        where: empresaId
          ? { id: usuarioId, empresa_id: empresaId }
          : { id: usuarioId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!target) throw new NotFoundException('Usuário não encontrado');
      if (target.id === atorId) {
        throw new BadRequestException(
          'Você não pode alterar o status da própria conta',
        );
      }
      if (target.role === Role.PLATFORM_ADMIN) {
        throw new BadRequestException(
          'Contas de administrador da plataforma não podem ser inativadas aqui',
        );
      }
      if (target.active === active) {
        throw new BadRequestException(
          active
            ? 'Este usuário já está ativo'
            : 'Este usuário já está inativo',
        );
      }
      if (!active && target.role === Role.ADMIN && empresaId) {
        const adminsAtivos = await manager.count(Usuario, {
          where: { empresa_id: empresaId, role: Role.ADMIN, active: true },
        });
        if (adminsAtivos <= 1) {
          throw new BadRequestException(
            'A escola precisa manter ao menos um administrador ativo',
          );
        }
      }

      target.active = active;
      target.session_version = (target.session_version ?? 0) + 1;
      await manager.save(Usuario, target);
      if (empresaId) {
        await manager.save(AdminAuditEvent, {
          empresa_id: empresaId,
          ator_id: atorId,
          acao: active ? 'usuario.reativado' : 'usuario.inativado',
          alvo_tipo: 'usuario',
          alvo_id: target.id,
          detalhes: {
            email: target.email,
            role: target.role,
            motivo: motivoNormalizado,
          },
        });
      }
      return target;
    });

    this.eventEmitter.emit(active ? 'usuario.reativado' : 'usuario.inativado', {
      userId: usuario.id,
    });
    return this.toUsuarioResumo(usuario);
  }

  private async getConviteValido(token: string, incluirEmpresa = false) {
    const convite = await this.conviteRepository.findOne({
      where: { token_hash: this.hashToken(token) },
      relations: incluirEmpresa ? ['empresa'] : [],
    });
    if (!convite || !this.estaValido(convite)) {
      throw new NotFoundException('Convite inválido, expirado ou já utilizado');
    }
    return convite;
  }

  private estaValido(convite: Convite) {
    return (
      !convite.revoked &&
      convite.uses < convite.max_uses &&
      convite.expires_at > new Date()
    );
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toResumo(convite: Convite) {
    const now = new Date();
    const status = convite.revoked
      ? 'revogado'
      : convite.expires_at <= now
        ? 'expirado'
        : convite.uses >= convite.max_uses
          ? 'utilizado'
          : 'ativo';

    return {
      id: convite.id,
      email: convite.email,
      expires_at: convite.expires_at,
      max_uses: convite.max_uses,
      uses: convite.uses,
      role: convite.role,
      registration_mode: convite.registration_mode ?? 'legacy_email',
      status,
      created_at: convite.created_at,
    };
  }
}
