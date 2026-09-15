import { SetMetadata } from '@nestjs/common';
import { FeatureName } from '../../config/features';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';

export const RequiresFeature = (feature: FeatureName) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);
