import { IsIn, IsString, Matches } from 'class-validator';

export class PresignProfileImageDto {
  @IsIn(['image/png', 'image/jpeg', 'image/webp'])
  contentType: string;
}

export class SaveProfileImageDto {
  @IsString()
  @Matches(/^profiles\/\d+\/avatar-[a-f0-9-]+\.(png|jpg|webp)$/)
  key: string;
}
