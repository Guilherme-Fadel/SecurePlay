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
  private static readonly UPLOAD_CACHE_CONTROL =
    'private, max-age=3600, stale-while-revalidate=86400';
  private static readonly MAX_CACHED_SIGNED_URLS = 2_000;
  private s3Client: S3Client;
  private bucketName: string;
  private readonly signedGetUrlCache = new Map<
    string,
    { url: string; refreshAt: number }
  >();
  private readonly pendingSignedGetUrls = new Map<string, Promise<string>>();
  private readonly signedGetUrlGenerations = new Map<string, number>();

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

  async resolveImageUrl(source: string | null): Promise<string | null> {
    if (!source?.startsWith('s3://')) return source;
    const prefix = `s3://${this.bucketName}/`;
    if (!source.startsWith(prefix) || source.length === prefix.length) {
      throw new BadRequestException('Referência de imagem S3 inválida');
    }
    return this.generatePresignedGetUrl(source.slice(prefix.length));
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
    // O mesmo caminho pode ser sobrescrito por uploads de conteúdo. Remover a
    // assinatura anterior garante que a próxima leitura use uma URL nova.
    this.invalidateSignedGetUrl(key);

    return createPresignedPost(this.s3Client, {
      Bucket: this.bucketName,
      Key: key,
      Expires: 300,
      Fields: {
        'Content-Type': contentType,
        'Cache-Control': S3Service.UPLOAD_CACHE_CONTROL,
      },
      Conditions: [
        ['eq', '$Content-Type', contentType],
        ['eq', '$Cache-Control', S3Service.UPLOAD_CACHE_CONTROL],
        ['content-length-range', 1, maxBytes],
      ],
    });
  }

  async generatePresignedGetUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const cacheKey = `${key}\u0000${expiresIn}`;
    const cached = this.signedGetUrlCache.get(cacheKey);
    if (cached && cached.refreshAt > Date.now()) return cached.url;

    const pending = this.pendingSignedGetUrls.get(cacheKey);
    if (pending) return pending;

    const generation = this.signedGetUrlGenerations.get(key) ?? 0;
    const request = this.signGetUrl(key, expiresIn)
      .then((url) => {
        const refreshMarginSeconds = Math.min(
          300,
          Math.max(1, Math.floor(expiresIn * 0.1)),
        );
        const cacheSeconds = Math.max(1, expiresIn - refreshMarginSeconds);
        if ((this.signedGetUrlGenerations.get(key) ?? 0) === generation) {
          this.rememberSignedGetUrl(cacheKey, url, cacheSeconds);
        }
        return url;
      })
      .finally(() => {
        if (this.pendingSignedGetUrls.get(cacheKey) === request) {
          this.pendingSignedGetUrls.delete(cacheKey);
        }
      });

    this.pendingSignedGetUrls.set(cacheKey, request);
    return request;
  }

  private async signGetUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      // Também cobre objetos antigos, enviados antes de Cache-Control passar a
      // fazer parte do formulário de upload.
      ResponseCacheControl: S3Service.UPLOAD_CACHE_CONTROL,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  private rememberSignedGetUrl(
    cacheKey: string,
    url: string,
    cacheSeconds: number,
  ) {
    if (
      !this.signedGetUrlCache.has(cacheKey) &&
      this.signedGetUrlCache.size >= S3Service.MAX_CACHED_SIGNED_URLS
    ) {
      const oldestKey = this.signedGetUrlCache.keys().next().value as
        | string
        | undefined;
      if (oldestKey) this.signedGetUrlCache.delete(oldestKey);
    }
    this.signedGetUrlCache.delete(cacheKey);
    this.signedGetUrlCache.set(cacheKey, {
      url,
      refreshAt: Date.now() + cacheSeconds * 1000,
    });
  }

  private invalidateSignedGetUrl(key: string) {
    const prefix = `${key}\u0000`;
    this.signedGetUrlGenerations.set(
      key,
      (this.signedGetUrlGenerations.get(key) ?? 0) + 1,
    );
    for (const cacheKey of this.signedGetUrlCache.keys()) {
      if (cacheKey.startsWith(prefix)) this.signedGetUrlCache.delete(cacheKey);
    }
    for (const cacheKey of this.pendingSignedGetUrls.keys()) {
      if (cacheKey.startsWith(prefix))
        this.pendingSignedGetUrls.delete(cacheKey);
    }
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
