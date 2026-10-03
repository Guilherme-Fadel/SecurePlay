import { BadRequestException } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';

describe('DashboardController ranking query', () => {
  const getRanking = jest.fn();
  const controller = new DashboardController({ getRanking } as never);
  const request = { user: { userId: 7 } };

  beforeEach(() => getRanking.mockClear());

  it('keeps the old request on current mode', async () => {
    await controller.getRanking(request, 'company');
    expect(getRanking).toHaveBeenCalledWith(
      7,
      'company',
      true,
      expect.objectContaining({ mode: 'current' }),
    );
  });

  it.each([
    ['unknown', undefined, undefined],
    ['total', '2026-09', undefined],
    ['season', '9999-01', undefined],
    ['current', undefined, '-1'],
  ])(
    'returns 400 for invalid ranking parameters',
    async (mode, season, companyId) => {
      await expect(
        controller.getRanking(request, 'global', companyId, mode, season),
      ).rejects.toThrow(BadRequestException);
      expect(getRanking).not.toHaveBeenCalled();
    },
  );

  it('returns 400 for an invalid scope', async () => {
    await expect(controller.getRanking(request, '-1' as never)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects repeated query parameters passed as arrays', async () => {
    await expect(
      controller.getRanking(request, 'global', undefined, 'season', [
        '2026-09',
        '2026-10',
      ] as never),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.getRanking(request, 'global', ['1', '2'] as never),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.getRanking(request, ['global', 'company'] as never),
    ).rejects.toThrow(BadRequestException);
  });
});
