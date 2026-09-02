import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { UsuarioCadastrarDto } from './dto/usuario.cadastrar.dto';
import { ResultadoDto } from 'src/resultado.dto';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { S3Service } from '../conteudo/s3/s3.service';
import {
  extensionForLogo,
  MAX_UPLOAD_BYTES,
} from '../conteudo/s3/upload-policy';
import { randomUUID } from 'crypto';
@Injectable()
export class UsuarioService {
  constructor(
    @Inject('USUARIO_REPOSITORY')
    private usuarioRepository: Repository<Usuario>,
    private readonly s3Service: S3Service,
  ) {}
  async getUsuarioDados(id: number) {
    let usuario: Usuario | null = null;
    try {
      usuario = await this.usuarioRepository.findOne({
        where: { id },
        relations: ['empresa'],
      });
    } catch {
      usuario = await this.usuarioRepository.findOne({ where: { id } });
    }
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return {
      userId: usuario.id,
      name: usuario.name,
      email: usuario.email,
      level: usuario.level,
      role: usuario.role,
      empresa_id: usuario.empresa_id ?? null,
      empresa_paleta: usuario.empresa?.paleta || null,
      empresa_logo: usuario.empresa?.logo_url || null,
      empresa_nome: usuario.empresa?.nome || null,
      nickname: usuario.nickname,
      nickname_pending: usuario.nickname_pending,
      nickname_request_status: usuario.nickname_request_status,
      profile_image_url: await this.resolveProfileImageUrl(
        usuario.profile_image_key,
      ),
    };
  }
  async getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
    const usuario = await this.usuarioRepository.findOne({ where: { email } });
    return usuario ?? undefined;
  }
  async getUsuarioById(id: number): Promise<Usuario | undefined> {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    return usuario ?? undefined;
  }
  async changePassword(userId: number, data: ChangePasswordDto) {
    if (data.currentPassword === data.newPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual',
      );
    }

    const usuario = await this.getUsuarioById(userId);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const senhaAtualValida = await bcrypt.compare(
      data.currentPassword,
      usuario.password,
    );
    if (!senhaAtualValida) {
      throw new BadRequestException('Senha atual inválida');
    }

    usuario.password = await bcrypt.hash(data.newPassword, 10);
    await this.usuarioRepository.save(usuario);

    return { message: 'Senha alterada com sucesso' };
  }
  async requestNickname(userId: number, requestedNickname: string) {
    const usuario = await this.getUsuarioById(userId);
    if (!usuario?.empresa_id) {
      throw new BadRequestException(
        'Seu perfil precisa estar vinculado a uma organização',
      );
    }

    const nickname = requestedNickname.trim().replace(/\s+/g, ' ');
    if (nickname.length < 3 || nickname.length > 24) {
      throw new BadRequestException('Use um apelido entre 3 e 24 caracteres');
    }
    if (!/^[\p{L}\p{N} _-]+$/u.test(nickname)) {
      throw new BadRequestException(
        'O apelido pode usar letras, números, espaço, hífen e sublinhado',
      );
    }

    if (usuario.nickname === nickname) {
      throw new BadRequestException('Este já é o seu apelido aprovado');
    }

    usuario.nickname_pending = nickname;
    usuario.nickname_request_status = 'pending';
    await this.usuarioRepository.save(usuario);

    return {
      nickname: usuario.nickname,
      nickname_pending: usuario.nickname_pending,
      nickname_request_status: usuario.nickname_request_status,
      message: 'Apelido enviado para aprovação do administrador da turma.',
    };
  }

  async presignProfileImage(userId: number, contentType: string) {
    const extension = extensionForLogo(contentType);
    const key = `profiles/${userId}/avatar-${randomUUID()}.${extension}`;
    const { url: uploadUrl, fields } =
      await this.s3Service.generatePresignedUploadPost(
        key,
        contentType,
        MAX_UPLOAD_BYTES.logo,
      );
    return { uploadUrl, fields, key };
  }

  async saveProfileImage(userId: number, key: string) {
    const validPrefix = `profiles/${userId}/`;
    if (!key.startsWith(validPrefix)) {
      throw new BadRequestException('Arquivo de perfil inválido');
    }

    const usuario = await this.getUsuarioById(userId);
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    usuario.profile_image_key = key;
    await this.usuarioRepository.save(usuario);

    return {
      profile_image_url: await this.resolveProfileImageUrl(key),
      message: 'Foto do perfil atualizada com sucesso.',
    };
  }
  async insertUsuario(data: UsuarioCadastrarDto): Promise<ResultadoDto> {
    const usuarioExistente = await this.getUsuarioByEmail(data.email);
    if (usuarioExistente) {
      return {
        sucesso: false,
        mensagem: 'Email já cadastrado',
      };
    }
    try {
      const senhaHash = await bcrypt.hash(data.password, 10);
      const usuario = this.usuarioRepository.create({
        name: data.name,
        email: data.email,
        password: senhaHash,
      });
      await this.usuarioRepository.save(usuario);
      return {
        sucesso: true,
        mensagem: 'Usuário criado com sucesso',
      };
    } catch (error: any) {
      if (error.code === '23505') {
        return {
          sucesso: false,
          mensagem: 'Email já cadastrado',
        };
      }
      return {
        sucesso: false,
        mensagem: 'Erro ao criar usuário',
      };
    }
  }

  private async resolveProfileImageUrl(
    key: string | null,
  ): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.s3Service.generatePresignedGetUrl(key);
    } catch {
      return null;
    }
  }
}
