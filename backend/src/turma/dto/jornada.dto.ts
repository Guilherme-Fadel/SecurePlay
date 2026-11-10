import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

export class SalvarModulosDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  modulo_ids: number[];
}

export class DefinirAberturaDto {
  @IsIn(['agora', 'agendar'])
  modo: 'agora' | 'agendar';

  /** Obrigatória ao agendar, com fuso explícito (o horário de Brasília vem do cliente). */
  @ValidateIf((dto: DefinirAberturaDto) => dto.modo === 'agendar')
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message: 'Informe a data de abertura com fuso horário',
  })
  abre_em?: string;
}
