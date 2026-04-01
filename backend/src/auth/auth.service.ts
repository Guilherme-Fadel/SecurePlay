import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from 'src/entities/usuarios/usuario.service';
import { LoginDto } from 'src/entities/usuarios/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(dto: LoginDto) {
  const { email, password } = dto;

  if (!email || !password) {
    throw new UnauthorizedException('Email ou senha não fornecidos');
  }

  const user = await this.usuarioService.getUsuarioByEmail(email);

  if (!user) {
    throw new UnauthorizedException('Usuário ou senha inválidos');
  }

  const senhaValida = await bcrypt.compare(password, user.password);

  if (!senhaValida) {
    throw new UnauthorizedException('Usuário ou senha inválidos');
  }

  return {
    message: 'Login realizado com sucesso',
    nome: user.name,
    token: this.jwtService.sign({
      sub: user.id,
      email: user.email,
    }),
  };
}
}
