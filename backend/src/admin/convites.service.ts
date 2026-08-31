import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { Empresa } from '../empresa/empresa.entity';
import { Role } from '../auth/roles.enum';
import { Usuario } from '../usuario/usuario.entity';
import { CompleteCadastroConviteDto } from './dto/complete-cadastro-convite.dto';
import { CreateConviteDto } from './dto/create-convite.dto';
import { Convite } from './entities/convite.entity';

@Injectable()
export class ConvitesService {
  constructor(
    @Inject('CONVITE_REPOSITORY')
    private readonly conviteRepository: Repository<Convite>,
    @Inject('USUARIO_REPOSITORY')
    private readonly usuarioRepository: Repository<Usuario>,
    @Inject('EMPRESA_REPOSITORY')
    private readonly empresaRepository: Repository<Empresa>,
    @Inject('DATA_SOURCE')
    private readonly dataSource: DataSource,
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

    return usuarios.map((usuario) => ({
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      level: usuario.level,
    }));
  }

  async criar(userId: number, dto: CreateConviteDto) {
    const empresa = await this.getEmpresaDoAdministrador(userId);
    return this.criarParaEmpresa(empresa.id, userId, dto);
  }

  async criarParaEmpresa(
    empresaId: number,
    userId: number,
    dto: CreateConviteDto,
  ) {
    await this.getEmpresa(empresaId);
    const email = dto.email?.trim().toLowerCase() || null;

    if (email && (await this.usuarioRepository.findOne({ where: { email } }))) {
      throw new BadRequestException('Este e-mail já possui um acesso cadastrado');
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
      max_uses: dto.max_uses ?? 1,
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
    const hash = this.hashToken(token);
    const email = dto.email.trim().toLowerCase();

    await this.dataSource.transaction(async (manager) => {
      const convite = await manager
        .getRepository(Convite)
        .createQueryBuilder('convite')
        .setLock('pessimistic_write')
        .where('convite.token_hash = :hash', { hash })
        .getOne();

      if (!convite || !this.estaValido(convite)) {
        throw new ForbiddenException('Este convite não está mais disponível');
      }

      if (convite.email && convite.email !== email) {
        throw new ForbiddenException('Use o e-mail para o qual este convite foi criado');
      }

      const usuarioRepository = manager.getRepository(Usuario);
      if (await usuarioRepository.findOne({ where: { email } })) {
        throw new BadRequestException('Este e-mail já possui um acesso cadastrado');
      }

      const usuario = usuarioRepository.create({
        name: dto.name.trim(),
        email,
        password: await bcrypt.hash(dto.password, 10),
        empresa_id: convite.empresa_id,
        role: Role.USER,
      });
      await usuarioRepository.save(usuario);

      convite.uses += 1;
      await manager.getRepository(Convite).save(convite);
    });

    return { sucesso: true, mensagem: 'Cadastro concluído. Você já pode entrar na plataforma.' };
  }

  private async getEmpresaDoAdministrador(userId: number) {
    const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });
    if (!usuario?.empresa_id) {
      throw new NotFoundException('Empresa não encontrada para este administrador');
    }

    return this.getEmpresa(usuario.empresa_id);
  }

  private async getEmpresa(empresaId: number) {
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
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
    return !convite.revoked && convite.uses < convite.max_uses && convite.expires_at > new Date();
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
      status,
      created_at: convite.created_at,
    };
  }
}
