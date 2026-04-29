import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Usuario } from './usuario.entity';
import { UsuarioCadastrarDto } from './dto/usuario.cadastrar.dto';
import { ResultadoDto } from 'src/resultado.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuarioService {

  constructor(
    @Inject('USUARIO_REPOSITORY')
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async getUsuarioDados(id: number){
    const usuario = await this.getUsuarioById(id);

    if (!usuario) {
    throw new NotFoundException('Usuário não encontrado');
    }

    return {
      userId: usuario.id,
      name: usuario.name,
      email: usuario.email,
      level: usuario.level
    };
  }

  async getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
      const usuario = await this.usuarioRepository.findOne({ where: { email } });
      return usuario ?? undefined;
    }

  async getUsuarioById(id: number): Promise<Usuario | undefined>{
    const usuario = await this.usuarioRepository.findOne({ where: { id } })
    return usuario ?? undefined
  }

  async createUsuario(data: UsuarioCadastrarDto): Promise<ResultadoDto> {
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
