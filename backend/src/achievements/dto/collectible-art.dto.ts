import { IsIn, IsString, MaxLength } from 'class-validator';

export class ArtUploadDto {
  @IsIn(['image/png', 'image/svg+xml'])
  contentType: 'image/png' | 'image/svg+xml';
}

export class ArtConfirmDto {
  @IsString()
  @MaxLength(255)
  key: string;
}
