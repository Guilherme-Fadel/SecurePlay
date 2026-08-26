import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Resposta de uma pergunta/quiz (uma escolha por questao).
 * Reutilizado pelo Quiz Relampago. A correcao e sempre server-side.
 */
export class QuizAnswerDto {
  @IsInt()
  questionId: number;

  @IsInt()
  @Min(0)
  selectedIndex: number;
}

/** Resposta de uma amostra do Caca ao Phishing. */
export class PhishingAnswerDto {
  @IsInt()
  sampleId: number;

  // true = jogador decidiu denunciar (achou golpe); false = confiar.
  @IsOptional()
  @IsBoolean()
  report?: boolean;

  // sinais marcados pelo jogador (chaves de sinal).
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  signals?: string[];
}

/** Resposta de um item da Classificacao de Dados. */
export class DataAnswerDto {
  @IsInt()
  itemId: number;

  @IsString()
  level: string;
}

/**
 * Submit generico da partida. O shape aceito depende do game_type da run.
 * Todos os campos sao opcionais aqui; o handler do jogo valida o que precisa.
 * O cliente nunca envia score/XP/multiplicador (calculados no servidor).
 */
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
