import {
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  NICKNAME_MESSAGE,
  NICKNAME_PATTERN,
} from '../../common/validators/nickname';

export class UpdateAdminUserDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsEmail()
  @MaxLength(100)
  email?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  @Matches(NICKNAME_PATTERN, { message: NICKNAME_MESSAGE })
  nickname?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100000)
  level?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['user', 'admin', 'teacher'])
  role?: 'user' | 'admin' | 'teacher';
}
