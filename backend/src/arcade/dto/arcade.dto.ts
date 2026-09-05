import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
export class StartRunParamsDto {
  @IsString()
  @MaxLength(40)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug deve conter apenas letras minusculas, numeros e hifens.',
  })
  slug: string;
}
export class QuizAnswerDto {
  @IsInt()
  questionId: number;
  @IsInt()
  @Min(0)
  selectedIndex: number;
}
export class PhishingAnswerDto {
  @IsInt()
  sampleId: number;
  @IsOptional()
  @IsBoolean()
  report?: boolean;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  signals?: string[];
}
export class DataAnswerDto {
  @IsInt()
  itemId: number;
  @IsString()
  level: string;
}
export class SubmitRunDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  quizAnswers?: QuizAnswerDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PhishingAnswerDto)
  phishingAnswers?: PhishingAnswerDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => DataAnswerDto)
  dataAnswers?: DataAnswerDto[];
}
