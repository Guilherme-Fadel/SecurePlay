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
    await expect(controller.getRanking(request, '-1')).rejects.toThrow(
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

  it('repassa category e unit válidos; sem eles não manda nada (resposta legada)', async () => {
    await controller.getRanking(request, 'company');
    expect((getRanking.mock.calls[0] as unknown[])[3]).toEqual(
      expect.objectContaining({ category: undefined, unit: undefined }),
    );
    getRanking.mockClear();
    await controller.getRanking(
      request,
      'company',
      undefined,
      undefined,
      undefined,
      'streak',
      'turmas',
    );
    expect(getRanking).toHaveBeenCalledWith(
      7,
      'company',
      true,
      expect.objectContaining({ category: 'streak', unit: 'turmas' }),
    );
  });

  it.each([
    ['sequence', undefined],
    [undefined, 'classes'],
    [['xp', 'streak'], undefined],
    [undefined, ['turmas', 'students']],
  ])(
    'returns 400 for invalid category/unit (%p, %p)',
    async (category, unit) => {
      await expect(
        controller.getRanking(
          request,
          'global',
          undefined,
          undefined,
          undefined,
          category,
          unit,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(getRanking).not.toHaveBeenCalled();
    },
  );
});
