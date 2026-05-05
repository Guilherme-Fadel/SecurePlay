import { Controller, Get, Post, Body, UseGuards, Query, Delete, Param } from "@nestjs/common";
import { BenefitsService } from "./benefits.service";
import { CreateBenefitsDto } from "./dto/benefits.dto";
import { ResultadoDto } from "src/resultado.dto";

@Controller('benefits')
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Post('criar')
  async criarBenefits(@Body() data: CreateBenefitsDto): Promise<ResultadoDto> {
    return this.benefitsService.insertBenefits(data)
  }

  @Get('buscar')
  async buscarBenefits(@Query('id') id?: number): Promise<CreateBenefitsDto | CreateBenefitsDto[]> {
    return this.benefitsService.getBenefits(id)
  }

  @Delete('deletar/:id')
  async deletarBenefits(@Param('id') id: number): Promise<ResultadoDto>{
    return this.benefitsService.deleteBenefits(id);
  }

};