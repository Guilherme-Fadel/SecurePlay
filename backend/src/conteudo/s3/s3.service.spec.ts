import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

describe('S3 image references', () => {
  const service = new S3Service(new ConfigService({ S3_BUCKET_NAME: 'test-media' }));
  const sign = jest.spyOn(service, 'generatePresignedGetUrl').mockResolvedValue('https://signed.example/image');
  beforeEach(() => sign.mockClear());

  it('preserves local paths, external URLs and null', async () => {
    for (const source of [null, '/challenges/test.png', 'https://cdn.example/test.png']) {
      expect(await service.resolveImageUrl(source)).toBe(source);
    }
    expect(sign).not.toHaveBeenCalled();
  });
  it('signs keys from the configured bucket', async () => {
    expect(await service.resolveImageUrl('s3://test-media/challenges/test.png')).toBe('https://signed.example/image');
    expect(sign).toHaveBeenCalledWith('challenges/test.png');
  });
  it('rejects other buckets and empty keys', async () => {
    await expect(service.resolveImageUrl('s3://other/test.png')).rejects.toThrow();
    await expect(service.resolveImageUrl('s3://test-media/')).rejects.toThrow();
    expect(sign).not.toHaveBeenCalled();
  });
});
