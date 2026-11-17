import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  NICKNAME_MESSAGE,
  NICKNAME_PATTERN,
} from '../../common/validators/nickname';

export class RequestNicknameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(NICKNAME_PATTERN, { message: NICKNAME_MESSAGE })
  nickname: string;
}
