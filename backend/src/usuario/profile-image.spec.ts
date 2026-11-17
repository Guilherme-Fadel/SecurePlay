import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UsuarioService } from './usuario.service';

/** M5/B8: a foto salva no perfil precisa ter sido enviada de fato ao bucket. */
describe('UsuarioService.saveProfileImage — conferência no S3', () => {
  function build(head: jest.Mock) {
    const repository = {
      findOne: jest.fn().mockResolvedValue({ id: 7 }),
      update: jest.fn().mockResolvedValue(undefined),
      manager: { connection: {} },
    };
    const service = new UsuarioService(
      repository as never,
      {
        headObject: head,
        generatePresignedGetUrl: jest.fn().mockResolvedValue('https://b/x'),
      } as never,
    );
    return { service, repository };
  }
  const key = 'profiles/7/avatar-1.png';

  it('saveProfileImage recusa chave inexistente no S3', async () => {
    const { service, repository } = build(jest.fn().mockResolvedValue(null));
    await expect(service.saveProfileImage(7, key)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('recusa tipo que não é imagem ou acima de 2 MB', async () => {
    for (const head of [
      { contentType: 'text/html', contentLength: 100 },
      { contentType: 'image/png', contentLength: 3 * 1024 * 1024 },
    ]) {
      const { service, repository } = build(jest.fn().mockResolvedValue(head));
      await expect(service.saveProfileImage(7, key)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    }
  });

  it('S3 indisponível não salva e responde 503', async () => {
    const { service } = build(jest.fn().mockRejectedValue(new Error('down')));
    await expect(service.saveProfileImage(7, key)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
