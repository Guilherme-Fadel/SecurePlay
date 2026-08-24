import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';

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
  @IsNumber()
  questionId: number;

  @IsNumber()
  selectedIndex: number;
}

export class SubmitChallengeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

export class SaveProgressDto {
  @IsNumber()
  questionId: number;

  @IsNumber()
  selectedIndex: number;
}
