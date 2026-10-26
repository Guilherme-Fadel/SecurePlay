import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export interface QuestionResponseDto {
  id: number;
  text: string;
  options: string[];
  order: number;
}

export interface ChallengeQuestionsResponseDto {
  challenge: {
    id: number;
    title: string;
    description: string;
    difficulty: string;
    duration: number;
    points: number;
  };
  questions: QuestionResponseDto[];
}

export class AnswerDto {
  @IsInt()
  @Min(1)
  questionId: number;

  @IsInt()
  @Min(0)
  selectedIndex: number;
}

export class SubmitChallengeDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((answer: AnswerDto | null) => answer?.questionId)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

export class SaveProgressDto {
  @IsInt()
  @Min(1)
  questionId: number;

  @IsInt()
  @Min(0)
  selectedIndex: number;
}
