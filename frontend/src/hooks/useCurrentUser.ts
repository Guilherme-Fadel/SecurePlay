import { useState, useEffect } from 'react';
import { CurrentUser, getMe } from "../services/me";



export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}