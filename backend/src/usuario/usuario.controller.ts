import { Controller, Post, Body } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { UsuarioCadastrarDto } from './dto/usuario.cadastrar.dto';
import { ResultadoDto } from 'src/resultado.dto';
import { Public } from 'src/auth/public.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Public()
  @Post('criar')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  async criar(@Body() data: UsuarioCadastrarDto): Promise<ResultadoDto> {
    return this.usuarioService.insertUsuario(data);
  }
}
