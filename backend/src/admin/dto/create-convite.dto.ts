import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsIn,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CreateConviteDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  validade_dias?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  max_uses?: number;

  @IsOptional()
  @IsBoolean()
  administrador?: boolean;

  @IsOptional()
  @IsIn(['legacy_email', 'school_student'])
  registration_mode?: 'legacy_email' | 'school_student';

  @IsOptional()
  @IsIn(['user', 'teacher', 'admin'])
  papel?: 'user' | 'teacher' | 'admin';

  /** Só para convite de aluno: o cadastro já entra nesta turma. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  turma_id?: number;
}
