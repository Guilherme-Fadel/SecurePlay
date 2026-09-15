import { useCurrentUser } from './useCurrentUser';
import { companyFeaturesForUser } from '@/config/features';

export function useCompanyFeatures() {
  const { user } = useCurrentUser();
  return companyFeaturesForUser(user);
}
