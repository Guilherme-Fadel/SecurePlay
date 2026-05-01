import { Controller, Get, Post, Body } from "@nestjs/common";
import { UsuarioService } from "./usuario.service";
import type { UsuarioCadastrarDto } from "./dto/usuario.cadastrar.dto";
import { ResultadoDto } from "src/resultado.dto";

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post('criar')
  async criar(@Body() data: UsuarioCadastrarDto): Promise<ResultadoDto> {
    return this.usuarioService.insertUsuario(data)
  }
};