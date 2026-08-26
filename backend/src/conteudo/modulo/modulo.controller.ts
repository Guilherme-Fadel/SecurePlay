import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { ModuloService } from './modulo.service';
import { CreateModuloDto, UpdateModuloDto } from './dto/modulo.dto';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';

@Controller('conteudo/modulos')
export class ModuloController {
  constructor(private readonly moduloService: ModuloService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.moduloService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.moduloService.findOne(id, req.user.userId);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateModuloDto) {
    return this.moduloService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateModuloDto,
  ) {
    return this.moduloService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.moduloService.delete(id);
  }
}
