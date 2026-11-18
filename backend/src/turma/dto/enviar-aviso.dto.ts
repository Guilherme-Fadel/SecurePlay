import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Aviso manual da gestão: só texto; o link do sino é fixo no servidor. */
export class EnviarAvisoDto {
  @Transform(aparar)
  @IsString()
  @Length(3, 100)
  title: string;

  @Transform(aparar)
  @IsString()
  @Length(3, 250)
  message: string;
}
