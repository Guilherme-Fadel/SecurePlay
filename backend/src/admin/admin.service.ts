import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { Empresa } from '../empresa/empresa.entity';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { S3Service } from '../conteudo/s3/s3.service';
import {
  extensionForLogo,
  MAX_UPLOAD_BYTES,
} from '../conteudo/s3/upload-policy';
import { Usuario } from '../usuario/usuario.entity';
import { Convite } from './entities/convite.entity';
import { resolveCompanyParameters } from '../config/features';
import { EmpresaParametrosAudit } from '../empresa/empresa-parametros-audit.entity';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { UpdateCompanyParametersDto } from './dto/update-company-parameters.dto';

@Injectable()
export class AdminService {
  constructor(
    @Inject('EMPRESA_REPOSITORY')
    private empresaRepository: Repository<Empresa>,
    @Inject('USUARIO_REPOSITORY')
    private usuarioRepository: Repository<Usuario>,
    @Inject('DATA_SOURCE')
    private readonly dataSource: DataSource,
    private readonly s3Service: S3Service,
  ) {}

  async getTema(userId: number) {
    const empresa = await this.getEmpresaDoUsuario(userId);
    return this.toTema(empresa);
  }

  async updateTema(userId: number, dto: UpdateTemaDto) {
    const empresa = await this.getEmpresaDoUsuario(userId);
    return this.updateTemaDaEmpresa(empresa.id, dto);
  }

  async presignLogo(userId: number, contentType: string) {
    const empresa = await this.getEmpresaDoUsuario(userId);
    return this.presignLogoDaEmpresa(empresa.id, contentType);
  }

  async listarEmpresas() {
    const empresas = await this.empresaRepository.find({
      order: { nome: 'ASC' },
    });
    return empresas.map((empresa) => ({
      id: empresa.id,
      nome: empresa.nome,
      logo_url: empresa.logo_url,
      paleta: empresa.paleta,
    }));
  }

  async criarEmpresa(
    nome: string,
    emailAdministrador: string,
    criadoPorId: number,
  ) {
    const token = randomBytes(32).toString('base64url');
    const email = emailAdministrador.toLowerCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const empresa = await this.dataSource.transaction(async (manager) => {
      const empresaRepository = manager.getRepository(Empresa);
      const usuarioRepository = manager.getRepository(Usuario);
      const conviteRepository = manager.getRepository(Convite);

      if (await empresaRepository.findOne({ where: { nome } })) {
        throw new BadRequestException('Já existe uma empresa com este nome');
      }
      if (await usuarioRepository.findOne({ where: { email } })) {
        throw new BadRequestException(
          'Este e-mail já possui um acesso cadastrado',
        );
      }

      const novaEmpresa = await empresaRepository.save(
        empresaRepository.create({
          nome,
          parametros_funcionalidades: resolveCompanyParameters(),
        }),
      );
      await conviteRepository.save(
        conviteRepository.create({
          token_hash: createHash('sha256').update(token).digest('hex'),
          email,
          empresa_id: novaEmpresa.id,
          criado_por_id: criadoPorId,
          expires_at: expiresAt,
          max_uses: 1,
          role: Role.ADMIN,
        }),
      );
      return novaEmpresa;
    });

    return {
      empresa: { id: empresa.id, ...this.toTema(empresa) },
      token,
    };
  }

  async listarUsuariosGlobais() {
    const usuarios = await this.usuarioRepository.find({
      relations: ['empresa'],
      order: { name: 'ASC' },
    });
    return usuarios.map((usuario) => ({
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      level: usuario.level,
      empresa_id: usuario.empresa_id ?? null,
      empresa_nome: usuario.empresa?.nome ?? null,
    }));
  }

  async getTemaDaEmpresa(empresaId: number) {
    return this.toTema(await this.getEmpresa(empresaId));
  }

  async getParametros(userId: number) {
    const empresa = await this.getEmpresaDoUsuario(userId);
    return resolveCompanyParameters(empresa.parametros_funcionalidades);
  }

  async getParametrosDaEmpresa(empresaId: number) {
    const empresa = await this.getEmpresa(empresaId);
    return resolveCompanyParameters(empresa.parametros_funcionalidades);
  }

  async updateParametrosDaEmpresa(
    empresaId: number,
    userId: number,
    dto: UpdateCompanyParametersDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const empresa = await manager.findOne(Empresa, {
        where: { id: empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!empresa) throw new NotFoundException('Empresa não encontrada');
      const anterior = resolveCompanyParameters(
        empresa.parametros_funcionalidades,
      );
      const atual = resolveCompanyParameters(dto);
      empresa.parametros_funcionalidades = atual;
      await manager.save(Empresa, empresa);
      await manager.save(EmpresaParametrosAudit, {
        empresa_id: empresaId,
        alterado_por_id: userId,
        anterior,
        atual,
      });
      return atual;
    });
  }

  async updateTemaDaEmpresa(empresaId: number, dto: UpdateTemaDto) {
    const empresa = await this.getEmpresa(empresaId);
    if (dto.paleta) empresa.paleta = dto.paleta;
    if (dto.logo_url !== undefined) empresa.logo_url = dto.logo_url;
    await this.empresaRepository.save(empresa);
    return this.toTema(empresa);
  }

  async updateConfiguracoesDaEmpresa(
    empresaId: number,
    userId: number,
    dto: UpdateCompanySettingsDto,
  ) {
    const empresa = await this.dataSource.transaction(async (manager) => {
      const target = await manager.findOne(Empresa, {
        where: { id: empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!target) throw new NotFoundException('Empresa não encontrada');
      const anterior = resolveCompanyParameters(
        target.parametros_funcionalidades,
      );
      if (dto.nome !== undefined) target.nome = dto.nome.trim();
      if (dto.paleta) target.paleta = dto.paleta;
      if (dto.logo_url !== undefined) target.logo_url = dto.logo_url;
      if (dto.parametros)
        target.parametros_funcionalidades = resolveCompanyParameters(
          dto.parametros,
        );
      await manager.save(Empresa, target);
      if (
        dto.parametros &&
        JSON.stringify(anterior) !==
          JSON.stringify(target.parametros_funcionalidades)
      ) {
        await manager.save(EmpresaParametrosAudit, {
          empresa_id: empresaId,
          alterado_por_id: userId,
          anterior,
          atual: resolveCompanyParameters(target.parametros_funcionalidades),
        });
      }
      return target;
    });
    return {
      tema: await this.toTema(empresa),
      parametros: resolveCompanyParameters(empresa.parametros_funcionalidades),
    };
  }

  async presignLogoDaEmpresa(empresaId: number, contentType: string) {
    const empresa = await this.getEmpresa(empresaId);
    const key = `empresas/${empresa.id}/logo-${randomBytes(12).toString('hex')}.${extensionForLogo(contentType)}`;
    const { url: uploadUrl, fields } =
      await this.s3Service.generatePresignedUploadPost(
        key,
        contentType,
        MAX_UPLOAD_BYTES.logo,
      );

    return { uploadUrl, fields, key };
  }

  private async getEmpresaDoUsuario(userId: number): Promise<Empresa> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: userId },
    });
    if (!usuario?.empresa_id) {
      throw new NotFoundException('Empresa não encontrada para este usuário');
    }
    return this.getEmpresa(usuario.empresa_id);
  }

  private async getEmpresa(empresaId: number): Promise<Empresa> {
    const empresa = await this.empresaRepository.findOne({
      where: { id: empresaId },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    return empresa;
  }

  private toTema(empresa: Empresa) {
    return {
      nome: empresa.nome,
      logo_url: empresa.logo_url,
      paleta: empresa.paleta,
    };
  }
}
