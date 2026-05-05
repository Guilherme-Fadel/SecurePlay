import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuarioService } from 'src/entities/usuarios/usuario.service';
import { LoginDto } from 'src/entities/usuarios/dto/login.dto';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
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

async signOut(req: any){
    
  const token = req.headers['authorization']?.split(' ')[1];
  const decoded = this.jwtService.decode(token) as { exp: number }
  const ttl = decoded.exp - Math.floor(Date.now() / 1000)

  if (ttl > 0){
    await this.redisService.set(`blacklist:${token}`, '1', ttl)
  }

  return { message: 'Logout realizado com sucesso' }
}
}
