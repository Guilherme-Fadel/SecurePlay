import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureGuard } from './feature.guard';
import { CompanyFeaturesService } from './company-features.service';

describe('FeatureGuard', () => {
  let requireFeature: jest.Mock;
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user: { userId: 7 } }) }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    requireFeature = jest.fn().mockResolvedValue(undefined);
  });

  function buildGuard(reflector: unknown) {
    return new FeatureGuard(
      reflector as Reflector,
      { requireFeature } as unknown as CompanyFeaturesService,
    );
  }

  it('allows routes without feature metadata', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = buildGuard(reflector);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(requireFeature).not.toHaveBeenCalled();
  });

  it('returns 404 for a feature disabled for the authenticated company', async () => {
    requireFeature.mockRejectedValue(new NotFoundException());
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('achievements'),
    };
    const guard = buildGuard(reflector);
    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('uses the authenticated user rather than request parameters', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('achievements'),
    };
    const guard = buildGuard(reflector);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(requireFeature).toHaveBeenCalledWith(7, 'achievements');
  });
});
