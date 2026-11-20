import { BadRequestException, Logger } from '@nestjs/common';
import { AdminCollectiblesArtService } from './admin-collectibles-art.service';

const UUID = '3f2b8c1e-9a4d-4e7a-8b6c-0d1e2f3a4b5c';
const TMP = `collectibles/tmp/${UUID}.png`;

function png(width: number, height: number) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function setup(body: Buffer | null = png(956, 1080)) {
  const s3 = {
    generatePresignedUploadPost: jest
      .fn()
      .mockResolvedValue({ url: 'https://up', fields: { a: 'b' } }),
    headObject: jest
      .fn()
      .mockResolvedValue(
        body ? { contentLength: body.length, contentType: 'image/png' } : null,
      ),
    getObjectBuffer: jest.fn().mockResolvedValue(body),
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    toS3Uri: jest.fn((key: string) => `s3://media/${key}`),
    resolveImageUrl: jest.fn((key: string) =>
      Promise.resolve(`https://signed/${key}`),
    ),
  };
  return { s3, service: new AdminCollectiblesArtService(s3 as never) };
}

describe('AdminCollectiblesArtService', () => {
  it('pede POST pré-assinado em collectibles/tmp limitado a 200 KB', async () => {
    const { service, s3 } = setup();
    const result = await service.createUpload('image/svg+xml');
    expect(result.uploadUrl).toBe('https://up');
    expect(result.key).toMatch(/^collectibles\/tmp\/[0-9a-f-]{36}\.svg$/);
    expect(s3.generatePresignedUploadPost).toHaveBeenCalledWith(
      result.key,
      'image/svg+xml',
      200 * 1024,
    );
  });

  it('confirma: grava o buffer validado na chave final e apaga a temporária', async () => {
    const { service, s3 } = setup();
    const result = await service.confirm(TMP);
    const validated = (await s3.getObjectBuffer.mock.results[0]
      .value) as Buffer;
    expect(s3.putObject).toHaveBeenCalledWith(
      `collectibles/${UUID}.png`,
      validated,
      'image/png',
      undefined,
    );
    expect(s3.getObjectBuffer).toHaveBeenCalledTimes(1);
    expect(s3.deleteObject).toHaveBeenCalledWith(TMP);
    expect(result).toEqual({
      artKey: `s3://media/collectibles/${UUID}.png`,
      artUrl: `https://signed/s3://media/collectibles/${UUID}.png`,
    });
  });

  it.each([
    `collectibles/${UUID}.png`,
    `collectibles/tmp/../${UUID}.png`,
    'modulos/1/thumbnail.png',
  ])('recusa chave fora do padrão sem tocar no bucket: %s', async (key) => {
    const { service, s3 } = setup();
    await expect(service.confirm(key)).rejects.toThrow(BadRequestException);
    expect(s3.getObjectBuffer).not.toHaveBeenCalled();
    expect(s3.deleteObject).not.toHaveBeenCalled();
  });

  it('SVG é gravado como attachment; PNG não', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 956 1080"><rect/></svg>',
    );
    const { service, s3 } = setup(svg);
    await service.confirm(`collectibles/tmp/${UUID}.svg`);
    expect(s3.putObject).toHaveBeenCalledWith(
      `collectibles/${UUID}.svg`,
      svg,
      'image/svg+xml',
      'attachment',
    );
  });

  it('arte inválida: apaga a temporária e devolve 400 com o motivo', async () => {
    const { service, s3 } = setup(png(500, 500));
    await expect(service.confirm(TMP)).rejects.toThrow(/500×500/);
    expect(s3.deleteObject).toHaveBeenCalledWith(TMP);
    expect(s3.putObject).not.toHaveBeenCalled();
  });

  it('arquivo grande demais é recusado sem ser lido', async () => {
    const { service, s3 } = setup();
    s3.headObject.mockResolvedValue({
      contentLength: 300 * 1024,
      contentType: 'image/png',
    });
    await expect(service.confirm(TMP)).rejects.toThrow(/200 KB/);
    expect(s3.getObjectBuffer).not.toHaveBeenCalled();
    expect(s3.deleteObject).toHaveBeenCalledWith(TMP);
  });

  it('arquivo ausente vira 400', async () => {
    const { service, s3 } = setup(null);
    await expect(service.confirm(TMP)).rejects.toThrow(BadRequestException);
    expect(s3.getObjectBuffer).not.toHaveBeenCalled();
  });

  describe('falha ao apagar a temporária', () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });
    afterEach(() => warn.mockRestore());

    it('arte recusada ainda devolve 400 (não 500) e registra aviso', async () => {
      const { service, s3 } = setup(png(500, 500));
      s3.deleteObject.mockRejectedValue(new Error('s3 fora do ar'));
      await expect(service.confirm(TMP)).rejects.toThrow(BadRequestException);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('arte aceita continua confirmada mesmo sem apagar a temporária', async () => {
      const { service, s3 } = setup();
      s3.deleteObject.mockRejectedValue(new Error('s3 fora do ar'));
      await expect(service.confirm(TMP)).resolves.toMatchObject({
        artKey: `s3://media/collectibles/${UUID}.png`,
      });
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});
