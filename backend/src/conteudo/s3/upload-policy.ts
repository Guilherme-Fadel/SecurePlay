import { BadRequestException } from '@nestjs/common';

export const LOGO_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const CONTENT_UPLOAD_TYPES = {
  thumbnail: ['image/png', 'image/jpeg', 'image/webp'],
  video: ['video/mp4'],
  page: ['image/png', 'image/jpeg', 'image/webp'],
} as const;

export const MAX_UPLOAD_BYTES = {
  logo: 2 * 1024 * 1024,
  thumbnail: 2 * 1024 * 1024,
  page: 5 * 1024 * 1024,
  video: 200 * 1024 * 1024,
} as const;

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

export function extensionForUpload(
  type: keyof typeof CONTENT_UPLOAD_TYPES,
  contentType: string,
) {
  if (!CONTENT_UPLOAD_TYPES[type].includes(contentType as never)) {
    throw new BadRequestException('Tipo de arquivo não permitido para este conteúdo');
  }
  return EXTENSIONS[contentType];
}

export function extensionForLogo(contentType: string) {
  if (!LOGO_CONTENT_TYPES.includes(contentType as (typeof LOGO_CONTENT_TYPES)[number])) {
    throw new BadRequestException('O logo deve ser PNG, JPEG ou WebP');
  }
  return EXTENSIONS[contentType];
}
