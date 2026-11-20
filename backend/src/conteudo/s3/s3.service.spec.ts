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

  it('resolves company logos only within the company and keeps legacy URLs', async () => {
    const ownKey = 'empresas/4/logo-1234567890abcdef12345678.webp';
    const otherKey = 'empresas/5/logo-1234567890abcdef12345678.webp';
    expect(await service.resolveCompanyLogoUrl(4, ownKey)).toBe(
      'https://signed.example/image',
    );
    expect(sign).toHaveBeenCalledWith(ownKey);
    sign.mockClear();
    expect(await service.resolveCompanyLogoUrl(4, otherKey)).toBeNull();
    expect(
      await service.resolveCompanyLogoUrl(4, 'empresas/4/other.webp'),
    ).toBeNull();
    expect(
      await service.resolveCompanyLogoUrl(4, 'https://cdn.example/logo.png'),
    ).toBe('https://cdn.example/logo.png');
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

const inputOf = (send: jest.Mock) =>
  (send.mock.calls as [{ input: unknown }][])[0][0].input;

describe('S3 object operations', () => {
  const setup = () => {
    const service = new S3Service(
      new ConfigService({ S3_BUCKET_NAME: 'test-media' }),
    );
    const send = jest.fn();
    (service as unknown as { s3Client: { send: jest.Mock } }).s3Client = {
      send,
    };
    return { service, send };
  };

  it('reads an object into a Buffer', async () => {
    const { service, send } = setup();
    send.mockResolvedValue({
      Body: {
        transformToByteArray: () => Promise.resolve(Uint8Array.from([1, 2, 3])),
      },
    });
    const body = await service.getObjectBuffer('collectibles/tmp/a.png');
    expect(body).toEqual(Buffer.from([1, 2, 3]));
    expect(inputOf(send)).toEqual({
      Bucket: 'test-media',
      Key: 'collectibles/tmp/a.png',
    });
  });

  it('writes a Buffer with content type and cache control', async () => {
    const { service, send } = setup();
    send.mockResolvedValue({});
    const body = Buffer.from([1, 2, 3]);
    await service.putObject('collectibles/a.png', body, 'image/png');
    expect(inputOf(send)).toEqual({
      Bucket: 'test-media',
      Key: 'collectibles/a.png',
      Body: body,
      ContentType: 'image/png',
      CacheControl: 'private, max-age=3600, stale-while-revalidate=86400',
    });
  });

  it('putObject sets ContentDisposition only when given', async () => {
    const { service, send } = setup();
    send.mockResolvedValue({});
    await service.putObject(
      'collectibles/a.svg',
      Buffer.from([1]),
      'image/svg+xml',
      'attachment',
    );
    expect(inputOf(send)).toMatchObject({ ContentDisposition: 'attachment' });
  });

  it('deletes an object', async () => {
    const { service, send } = setup();
    send.mockResolvedValue({});
    await service.deleteObject('collectibles/tmp/a.png');
    expect(inputOf(send)).toEqual({
      Bucket: 'test-media',
      Key: 'collectibles/tmp/a.png',
    });
  });
  it('builds the s3:// reference for the configured bucket', () => {
    const { service } = setup();
    expect(service.toS3Uri('collectibles/a.png')).toBe(
      's3://test-media/collectibles/a.png',
    );
  });
});
