import { Controller, Get, Post, Body, UseGuards, Query, Delete, Param } from "@nestjs/common";
import { BenefitsService } from "./benefits.service";
import type { CreateBenefitsDto } from "./dto/benefits.dto";
import { Benefits } from './benefits.entity';
import { ResultadoDto } from "src/resultado.dto";
import { JwtAuthGuard } from "src/auth/auth.guard";

@Controller('benefits')
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Post('criar')
  @UseGuards(JwtAuthGuard)
  async criarBenefits(@Body() data: CreateBenefitsDto): Promise<ResultadoDto> {
    return this.benefitsService.createBenefits(data)
  }

  @Get('buscar')
  @UseGuards(JwtAuthGuard)
  async buscarBenefits(@Query('id') id?: number): Promise<Benefits | Benefits[]> {
    return this.benefitsService.getBenefits(id)
  }

  @Delete('deletar/:id')
  @UseGuards(JwtAuthGuard)
  async deletarBenefits(@Param('id') id: number): Promise<ResultadoDto>{
    return this.benefitsService.deleteBenefits(id);
  }

};