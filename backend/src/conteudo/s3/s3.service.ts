import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { extensionForUpload } from './upload-policy';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>(
      'S3_BUCKET_NAME',
      'secureplay-media',
    );

    const endpoint = this.configService.get<string>('S3_ENDPOINT')?.trim();
    const forcePathStyle =
      this.configService.get<string>('S3_FORCE_PATH_STYLE')?.toLowerCase() ===
      'true';

    this.s3Client = new S3Client({
      region: this.configService.get<string>(
        'AWS_REGION',
        endpoint ? 'auto' : 'us-east-1',
      ),
      endpoint: endpoint || undefined,
      forcePathStyle,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });
  }

  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async generatePresignedUploadPost(
    key: string,
    contentType: string,
    maxBytes: number,
  ) {
    return createPresignedPost(this.s3Client, {
      Bucket: this.bucketName,
      Key: key,
      Expires: 300,
      Fields: { 'Content-Type': contentType },
      Conditions: [
        ['eq', '$Content-Type', contentType],
        ['content-length-range', 1, maxBytes],
      ],
    });
  }

  async generatePresignedGetUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  buildKey(
    type: 'thumbnail' | 'video' | 'page',
    moduloId: number,
    aulaId?: number,
    pageOrder?: number,
    contentType?: string,
  ): string {
    const extension = extensionForUpload(type, contentType ?? '');
    if ((type === 'video' || type === 'page') && !aulaId) {
      throw new BadRequestException(
        'aulaId é obrigatório para este tipo de conteúdo',
      );
    }
    if (type === 'page' && !pageOrder) {
      throw new BadRequestException('pageOrder é obrigatório para páginas');
    }
    switch (type) {
      case 'thumbnail':
        return `modulos/${moduloId}/thumbnail.${extension}`;
      case 'video':
        return `modulos/${moduloId}/aulas/${aulaId}/video.${extension}`;
      case 'page':
        return `modulos/${moduloId}/aulas/${aulaId}/pages/${pageOrder}.${extension}`;
    }
  }
}
