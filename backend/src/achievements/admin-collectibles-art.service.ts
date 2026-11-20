import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { S3Service } from '../conteudo/s3/s3.service';
import {
  ART_MIME_BY_EXT,
  MAX_ART_BYTES,
  artExtensionOf,
  finalArtKey,
  isTmpArtKey,
  tmpArtKey,
  validateArt,
} from './collectible-art';

@Injectable()
export class AdminCollectiblesArtService {
  private readonly logger = new Logger(AdminCollectiblesArtService.name);

  constructor(private readonly s3: S3Service) {}

  /** POST pré-assinado para `collectibles/tmp/<uuid>.<ext>`, limitado a 200 KB. */
  async createUpload(contentType: 'image/png' | 'image/svg+xml') {
    const ext = contentType === ART_MIME_BY_EXT.svg ? 'svg' : 'png';
    const key = tmpArtKey(randomUUID(), ext);
    const { url: uploadUrl, fields } =
      await this.s3.generatePresignedUploadPost(
        key,
        contentType,
        MAX_ART_BYTES,
      );
    return { uploadUrl, fields, key };
  }

  /**
   * Valida o arquivo enviado e o promove para `collectibles/<uuid>.<ext>`.
   * Arquivo recusado é apagado da área temporária.
   */
  async confirm(key: string) {
    if (!isTmpArtKey(key)) {
      throw new BadRequestException('Chave de arte inválida');
    }
    const head = await this.s3.headObject(key);
    if (!head) {
      throw new BadRequestException(
        'Arquivo não encontrado: envie a arte de novo.',
      );
    }
    if (head.contentLength > MAX_ART_BYTES) {
      // Não carrega em memória um arquivo que já se sabe grande demais.
      await this.discardTmp(key);
      throw new BadRequestException('O arquivo passa de 200 KB.');
    }
    const mime = ART_MIME_BY_EXT[artExtensionOf(key)];
    const buffer = await this.s3.getObjectBuffer(key);
    const verdict = validateArt(buffer, mime);
    if (!verdict.ok) {
      await this.discardTmp(key);
      throw new BadRequestException(verdict.reason);
    }
    // Grava o próprio buffer validado: o objeto temporário pode ser sobrescrito
    // (o POST pré-assinado ainda vale) entre a validação e uma cópia.
    const finalKey = finalArtKey(key);
    // SVG vai como attachment: aberto direto na URL pré-assinada ele baixa em vez de
    // renderizar. `<image href>` e background-image do app ignoram esse cabeçalho.
    await this.s3.putObject(
      finalKey,
      buffer,
      mime,
      mime === ART_MIME_BY_EXT.svg ? 'attachment' : undefined,
    );
    await this.discardTmp(key);
    const artKey = this.s3.toS3Uri(finalKey);
    return { artKey, artUrl: await this.s3.resolveImageUrl(artKey) };
  }

  /** Falha ao limpar a área temporária não pode virar 500 nem desfazer a decisão. */
  private async discardTmp(key: string) {
    try {
      await this.s3.deleteObject(key);
    } catch (error) {
      this.logger.warn(
        `Não foi possível apagar a arte temporária ${key}: ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
      );
    }
  }
}
