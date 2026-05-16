import { CurrentUser, getMe } from '@/services/me';
import { useCachedQuery } from './useCachedQuery';

export function useCurrentUser() {
  const { data: user, loading } = useCachedQuery<CurrentUser>('currentUser', getMe);
  return { user, loading };
}
