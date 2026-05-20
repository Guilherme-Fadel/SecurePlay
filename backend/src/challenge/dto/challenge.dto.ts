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
