import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { UsuarioCadastrarDto } from './dto/usuario.cadastrar.dto';
import { ResultadoDto } from 'src/resultado.dto';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
@Injectable()
export class UsuarioService {
  constructor(
    @Inject('USUARIO_REPOSITORY')
    private usuarioRepository: Repository<Usuario>,
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
      throw new BadRequestException('A nova senha deve ser diferente da senha atual');
    }

    const usuario = await this.getUsuarioById(userId);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const senhaAtualValida = await bcrypt.compare(data.currentPassword, usuario.password);
    if (!senhaAtualValida) {
      throw new BadRequestException('Senha atual inválida');
    }

    usuario.password = await bcrypt.hash(data.newPassword, 10);
    await this.usuarioRepository.save(usuario);

    return { message: 'Senha alterada com sucesso' };
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
}
