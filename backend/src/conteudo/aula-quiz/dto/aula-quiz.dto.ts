import { IsString, IsInt, IsArray, IsOptional, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuizDto {
  @IsInt()
  aula_id: number;

  @IsString()
  @MaxLength(500)
  text: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  correct_index: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
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
