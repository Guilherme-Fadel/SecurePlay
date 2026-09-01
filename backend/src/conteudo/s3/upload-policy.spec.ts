import { BadRequestException } from '@nestjs/common';
import { extensionForLogo, extensionForUpload } from './upload-policy';

describe('upload policy', () => {
  it('mantém a extensão coerente com o tipo de conteúdo autorizado', () => {
    expect(extensionForLogo('image/webp')).toBe('webp');
    expect(extensionForUpload('video', 'video/mp4')).toBe('mp4');
  });

  it('rejeita conteúdo ativo ou incompatível com a finalidade do upload', () => {
    expect(() => extensionForLogo('image/svg+xml')).toThrow(BadRequestException);
    expect(() => extensionForUpload('video', 'image/png')).toThrow(BadRequestException);
  });
});
