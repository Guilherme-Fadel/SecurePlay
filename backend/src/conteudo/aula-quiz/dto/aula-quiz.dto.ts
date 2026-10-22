import {
  IsString,
  IsInt,
  IsArray,
  IsOptional,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMinSize,
  IsNotEmpty,
  Equals,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuizDto {
  @IsInt()
  @Min(1)
  aula_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  correct_index: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  correct_index?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class DeleteQuizDto {
  @Equals(true)
  confirm: true;
}

export class QuizAnswerDto {
  @IsInt()
  questionId: number;

  @IsInt()
  @Min(0)
  selectedIndex: number;
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
