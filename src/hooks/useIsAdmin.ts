import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getAdmins } from '@/services/admin';

export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    getAdmins()
      .then((admins) => {
        setIsAdmin(admins.some((a) => 
          a.user_id.toLowerCase() === user.id.toLowerCase() || 
          a.user_id.toLowerCase() === user.email.toLowerCase()
        ));
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  return { isAdmin, loading };
}
