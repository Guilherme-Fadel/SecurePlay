import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Empresa } from '../empresa/empresa.entity';
import { UpdateTemaDto } from './dto/update-tema.dto';
import { S3Service } from '../conteudo/s3/s3.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject('EMPRESA_REPOSITORY')
    private empresaRepository: Repository<Empresa>,
    @Inject('USUARIO_REPOSITORY')
    private usuarioRepository: Repository<any>,
    private readonly s3Service: S3Service,
  ) {}

  async getTema(userId: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: userId },
      relations: ['empresa'],
    });

    if (!usuario || !usuario.empresa) {
      throw new NotFoundException('Empresa não encontrada para este usuário');
    }

    return {
      nome: usuario.empresa.nome,
      logo_url: usuario.empresa.logo_url,
      paleta: usuario.empresa.paleta,
    };
  }

  async updateTema(userId: number, dto: UpdateTemaDto) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: userId },
      relations: ['empresa'],
    });

    if (!usuario || !usuario.empresa) {
      throw new NotFoundException('Empresa não encontrada para este usuário');
    }

    const empresa = usuario.empresa;

    if (dto.paleta) {
      empresa.paleta = dto.paleta;
    }

    if (dto.logo_url !== undefined) {
      empresa.logo_url = dto.logo_url;
    }

    await this.empresaRepository.save(empresa);

    return {
      nome: empresa.nome,
      logo_url: empresa.logo_url,
      paleta: empresa.paleta,
    };
  }

  async presignLogo(userId: number, contentType: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: userId },
      relations: ['empresa'],
    });

    if (!usuario || !usuario.empresa) {
      throw new NotFoundException('Empresa não encontrada para este usuário');
    }

    const key = `empresas/${usuario.empresa.id}/logo`;
    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      key,
      contentType,
    );

    return { uploadUrl, key };
  }
}
