import { IsIn } from 'class-validator';
import { LOGO_CONTENT_TYPES } from '../../conteudo/s3/upload-policy';

export class PresignLogoDto {
  @IsIn(LOGO_CONTENT_TYPES)
  contentType: string;
}
