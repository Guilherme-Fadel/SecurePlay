import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Empresa } from '../empresa/empresa.entity';
import { Role } from '../auth/roles.enum';
import { Usuario } from '../usuario/usuario.entity';
import { CompleteCadastroConviteDto } from './dto/complete-cadastro-convite.dto';
import { CreateConviteDto } from './dto/create-convite.dto';
import { Convite } from './entities/convite.entity';
import { RegistrationService } from '../registration/registration.service';

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
  ) {}

  async listarUsuarios(userId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.listarUsuariosDaEmpresa(empresa.id);
  }

  async listarUsuariosDaEmpresa(empresaId: number) {
    const usuarios = await this.usuarioRepository.find({
      where: { empresa_id: empresaId },
      order: { name: 'ASC' },
    });

    return usuarios.map((usuario) => this.toUsuarioResumo(usuario));
  }

  async listarApelidosPendentes(
    userId: number,
    filtros: { page?: number; pageSize?: number; search?: string },
  ) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.listarApelidosPendentesDaEmpresa(empresa.id, filtros);
  }

  async listarApelidosPendentesDaEmpresa(
    empresaId: number,
    filtros: { page?: number; pageSize?: number; search?: string },
  ) {
    const page = Number.isFinite(filtros.page)
      ? Math.max(1, Math.floor(filtros.page as number))
      : 1;
    const pageSize = Number.isFinite(filtros.pageSize)
      ? Math.min(100, Math.max(10, Math.floor(filtros.pageSize as number)))
      : 25;
    const search = filtros.search?.trim().slice(0, 100);
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

    const [usuarios, total] = await query
      .orderBy('usuario.id', 'DESC')
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
      max_uses: roleDoConvite === Role.ADMIN ? 1 : (dto.max_uses ?? 1),
      role: roleDoConvite,
    });
    const saved = await this.conviteRepository.save(convite);

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

  async revogar(userId: number, conviteId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.revogarDaEmpresa(empresa.id, conviteId);
  }

  async revogarDaEmpresa(empresaId: number, conviteId: number) {
    const convite = await this.conviteRepository.findOne({
      where: { id: conviteId, empresa_id: empresaId },
    });
    if (!convite) throw new NotFoundException('Convite não encontrado');

    convite.revoked = true;
    await this.conviteRepository.save(convite);
    return this.toResumo(convite);
  }

  async consultarPublico(token: string) {
    const convite = await this.getConviteValido(token, true);
    return {
      empresa_nome: convite.empresa.nome,
      email: convite.email,
      expires_at: convite.expires_at,
    };
  }

  async completarCadastro(token: string, dto: CompleteCadastroConviteDto) {
    return this.registrationService.startInvite(token, dto);
  }

  async aprovarApelido(userId: number, usuarioId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.aprovarApelidoDaEmpresa(empresa.id, usuarioId);
  }

  async aprovarApelidoDaEmpresa(empresaId: number, usuarioId: number) {
    const usuario = await this.getUsuarioDaEmpresa(empresaId, usuarioId);
    if (usuario.role !== Role.USER) {
      throw new BadRequestException(
        'Usuários de gerência não podem ter apelidos no ranking',
      );
    }
    if (!usuario.nickname_pending) {
      throw new BadRequestException('Não há apelido pendente para aprovar');
    }

    usuario.nickname = usuario.nickname_pending;
    usuario.nickname_pending = null;
    usuario.nickname_request_status = 'approved';
    await this.usuarioRepository.save(usuario);
    return this.toUsuarioResumo(usuario);
  }

  async rejeitarApelido(userId: number, usuarioId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.rejeitarApelidoDaEmpresa(empresa.id, usuarioId);
  }

  async rejeitarApelidoDaEmpresa(empresaId: number, usuarioId: number) {
    const usuario = await this.getUsuarioDaEmpresa(empresaId, usuarioId);
    if (usuario.role !== Role.USER) {
      throw new BadRequestException(
        'Usuários de gerência não podem ter apelidos no ranking',
      );
    }
    if (!usuario.nickname_pending) {
      throw new BadRequestException('Não há apelido pendente para rejeitar');
    }

    usuario.nickname_pending = null;
    usuario.nickname_request_status = 'rejected';
    await this.usuarioRepository.save(usuario);
    return this.toUsuarioResumo(usuario);
  }

  async inativarUsuario(userId: number, usuarioId: number) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.inativarUsuarioDaEmpresa(empresa.id, userId, usuarioId);
  }

  async inativarUsuarioDaEmpresa(
    empresaId: number,
    atorId: number,
    usuarioId: number,
  ) {
    const usuario = await this.getUsuarioDaEmpresa(empresaId, usuarioId);
    return this.inativar(usuario, atorId);
  }

  async inativarUsuarioGlobal(atorId: number, usuarioId: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return this.inativar(usuario, atorId);
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
      role: usuario.role,
      level: usuario.level,
      active: usuario.active,
      nickname: usuario.nickname,
      nickname_pending: usuario.nickname_pending,
      nickname_request_status: usuario.nickname_request_status,
    };
  }

  private async inativar(usuario: Usuario, atorId: number) {
    if (usuario.id === atorId) {
      throw new BadRequestException('Você não pode inativar a própria conta');
    }
    if (usuario.role === Role.PLATFORM_ADMIN) {
      throw new BadRequestException(
        'Contas de administrador da plataforma não podem ser inativadas aqui',
      );
    }
    if (!usuario.active) {
      throw new BadRequestException('Este usuário já está inativo');
    }

    usuario.active = false;
    await this.usuarioRepository.save(usuario);
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
      status,
      created_at: convite.created_at,
    };
  }
}
