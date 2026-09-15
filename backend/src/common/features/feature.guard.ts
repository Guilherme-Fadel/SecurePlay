import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureName } from '../../config/features';
import { CompanyFeaturesService } from './company-features.service';
import { REQUIRED_FEATURE_KEY } from './feature.decorator';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly companyFeatures: CompanyFeaturesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<FeatureName>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!feature) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user?.userId)
      throw new NotFoundException('Funcionalidade não disponível');
    await this.companyFeatures.requireFeature(user.userId, feature);
    return true;
  }
}
