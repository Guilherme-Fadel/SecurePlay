import { IsString } from 'class-validator';

export class PresignLogoDto {
  @IsString()
  contentType: string;
}
