import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

describe('S3 image references', () => {
  const service = new S3Service(
    new ConfigService({ S3_BUCKET_NAME: 'test-media' }),
  );
  const sign = jest
    .spyOn(service, 'generatePresignedGetUrl')
    .mockResolvedValue('https://signed.example/image');
  beforeEach(() => sign.mockClear());

  it('preserves local paths, external URLs and null', async () => {
    for (const source of [
      null,
      '/challenges/test.png',
      'https://cdn.example/test.png',
    ]) {
      expect(await service.resolveImageUrl(source)).toBe(source);
    }
    expect(sign).not.toHaveBeenCalled();
  });
  it('signs keys from the configured bucket', async () => {
    expect(
      await service.resolveImageUrl('s3://test-media/challenges/test.png'),
    ).toBe('https://signed.example/image');
    expect(sign).toHaveBeenCalledWith('challenges/test.png');
  });
  it('rejects other buckets and empty keys', async () => {
    await expect(
      service.resolveImageUrl('s3://other/test.png'),
    ).rejects.toThrow();
    await expect(service.resolveImageUrl('s3://test-media/')).rejects.toThrow();
    expect(sign).not.toHaveBeenCalled();
  });
});

describe('S3 signed GET cache', () => {
  it('reuses one signed URL for repeated and concurrent reads', async () => {
    const service = new S3Service(
      new ConfigService({ S3_BUCKET_NAME: 'test-media' }),
    );
    const signer = jest
      .spyOn(
        service as unknown as {
          signGetUrl: (key: string, expiresIn: number) => Promise<string>;
        },
        'signGetUrl',
      )
      .mockResolvedValue('https://signed.example/stable-image');

    const urls = await Promise.all([
      service.generatePresignedGetUrl('ui/image.png'),
      service.generatePresignedGetUrl('ui/image.png'),
    ]);
    const nextUrl = await service.generatePresignedGetUrl('ui/image.png');

    expect(urls).toEqual([
      'https://signed.example/stable-image',
      'https://signed.example/stable-image',
    ]);
    expect(nextUrl).toBe('https://signed.example/stable-image');
    expect(signer).toHaveBeenCalledTimes(1);
  });

  it('keeps signatures with different expirations isolated', async () => {
    const service = new S3Service(
      new ConfigService({ S3_BUCKET_NAME: 'test-media' }),
    );
    const signer = jest
      .spyOn(
        service as unknown as {
          signGetUrl: (key: string, expiresIn: number) => Promise<string>;
        },
        'signGetUrl',
      )
      .mockImplementation((_key, expiresIn) =>
        Promise.resolve(`https://signed.example/image?ttl=${expiresIn}`),
      );

    await service.generatePresignedGetUrl('ui/image.png', 900);
    await service.generatePresignedGetUrl('ui/image.png', 3600);

    expect(signer).toHaveBeenCalledTimes(2);
  });
});
