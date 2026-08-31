import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Empresa } from '../empresa/empresa.entity';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { S3Service } from '../conteudo/s3/s3.service';
import { Usuario } from '../usuario/usuario.entity';

@Injectable()
export class AdminService {
  constructor(
    @Inject('EMPRESA_REPOSITORY')
    private empresaRepository: Repository<Empresa>,
    @Inject('USUARIO_REPOSITORY')
    private usuarioRepository: Repository<Usuario>,
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
    const empresas = await this.empresaRepository.find({ order: { nome: 'ASC' } });
    return empresas.map((empresa) => ({
      id: empresa.id,
      nome: empresa.nome,
      logo_url: empresa.logo_url,
      paleta: empresa.paleta,
    }));
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

  async updateTemaDaEmpresa(empresaId: number, dto: UpdateTemaDto) {
    const empresa = await this.getEmpresa(empresaId);
    if (dto.paleta) empresa.paleta = dto.paleta;
    if (dto.logo_url !== undefined) empresa.logo_url = dto.logo_url;
    await this.empresaRepository.save(empresa);
    return this.toTema(empresa);
  }

  async presignLogoDaEmpresa(empresaId: number, contentType: string) {
    const empresa = await this.getEmpresa(empresaId);
    const key = `empresas/${empresa.id}/logo`;
    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      key,
      contentType,
    );

    return { uploadUrl, key };
  }

  private async getEmpresaDoUsuario(userId: number): Promise<Empresa> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: userId } });
    if (!usuario?.empresa_id) {
      throw new NotFoundException('Empresa não encontrada para este usuário');
    }
    return this.getEmpresa(usuario.empresa_id);
  }

  private async getEmpresa(empresaId: number): Promise<Empresa> {
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
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
