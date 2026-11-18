import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  ParseIntPipe,
  Post,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { TurmaService } from './turma.service';
import { TurmaAcessoService } from './turma-acesso.service';
import { TurmaAvisosService } from './turma-avisos.service';
import { EnviarAvisoDto } from './dto/enviar-aviso.dto';

type AdminRequest = { user: { userId: number } };

/** Aviso da gestão da escola; a empresa vem do banco, nunca do corpo ou da URL. */
@Controller('admin/empresa/turmas')
@Roles(Role.ADMIN)
export class TurmaAvisosAdminController {
  constructor(
    private readonly avisos: TurmaAvisosService,
    private readonly acesso: TurmaAcessoService,
  ) {}

  @Post(':turmaId/avisos')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async enviar(
    @Request() req: AdminRequest,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Body() dto: EnviarAvisoDto,
  ) {
    const ator = await this.acesso.carregarAtor(req.user.userId);
    if (ator.role !== Role.ADMIN || !ator.empresa_id)
      throw new ForbiddenException('Empresa inválida');
    return this.avisos.enviar(ator.id, ator.empresa_id, turmaId, dto);
  }
}

/** Mesma operação para a plataforma, com a empresa escolhida na rota. */
@Controller('platform/admin/empresas/:empresaId/turmas')
@Roles(Role.PLATFORM_ADMIN)
export class TurmaAvisosPlatformController {
  constructor(
    private readonly avisos: TurmaAvisosService,
    private readonly turmas: TurmaService,
  ) {}

  @Post(':turmaId/avisos')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async enviar(
    @Request() req: AdminRequest,
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('turmaId', ParseIntPipe) turmaId: number,
    @Body() dto: EnviarAvisoDto,
  ) {
    await this.turmas.assertEmpresa(empresaId);
    return this.avisos.enviar(req.user.userId, empresaId, turmaId, dto);
  }
}
