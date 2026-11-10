import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class SalvarTurmaDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  nome: string;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  ano_letivo: number;
}
