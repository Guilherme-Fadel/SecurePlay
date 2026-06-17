import { Controller, Post, Body } from '@nestjs/common';
import { S3Service } from './s3.service';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/roles.enum';
import { IsString, IsInt, IsOptional } from 'class-validator';

class PresignUploadDto {
  @IsString()
  type: 'thumbnail' | 'video' | 'page';

  @IsInt()
  moduloId: number;

  @IsOptional()
  @IsInt()
  aulaId?: number;

  @IsOptional()
  @IsInt()
  pageOrder?: number;

  @IsString()
  contentType: string;
}

@Controller('conteudo/upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('presign')
  @Roles(Role.ADMIN)
  async getPresignedUrl(@Body() dto: PresignUploadDto) {
    const key = this.s3Service.buildKey(dto.type, dto.moduloId, dto.aulaId, dto.pageOrder);
    const url = await this.s3Service.generatePresignedUploadUrl(key, dto.contentType);

    return {
      uploadUrl: url,
      key,
    };
  }
}
