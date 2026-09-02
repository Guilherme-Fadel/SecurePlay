import { Controller, Post, Body } from '@nestjs/common';
import { S3Service } from './s3.service';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { CONTENT_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from './upload-policy';

class PresignUploadDto {
  @IsString()
  @IsIn(['thumbnail', 'video', 'page'])
  type: 'thumbnail' | 'video' | 'page';

  @IsInt()
  @Min(1)
  moduloId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  aulaId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageOrder?: number;

  @IsIn([...CONTENT_UPLOAD_TYPES.thumbnail, ...CONTENT_UPLOAD_TYPES.video])
  contentType: string;
}

@Controller('conteudo/upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('presign')
  @Roles(Role.PLATFORM_ADMIN)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async getPresignedUrl(@Body() dto: PresignUploadDto) {
    const key = this.s3Service.buildKey(
      dto.type,
      dto.moduloId,
      dto.aulaId,
      dto.pageOrder,
      dto.contentType,
    );
    const { url: uploadUrl, fields } =
      await this.s3Service.generatePresignedUploadPost(
        key,
        dto.contentType,
        MAX_UPLOAD_BYTES[dto.type],
      );

    return {
      uploadUrl,
      fields,
      key,
    };
  }
}
