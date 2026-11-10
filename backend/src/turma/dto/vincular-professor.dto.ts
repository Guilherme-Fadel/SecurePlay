import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class VincularProfessorDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuario_id: number;
}
