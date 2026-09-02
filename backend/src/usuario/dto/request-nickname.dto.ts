import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RequestNicknameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[\p{L}\p{N} _-]+$/u, {
    message: 'O apelido pode usar letras, números, espaço, hífen e sublinhado',
  })
  nickname: string;
}
