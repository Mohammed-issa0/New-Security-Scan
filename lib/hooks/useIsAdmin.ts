'use client';

import { useEffect, useState } from 'react';
import { tokenStore } from '@/lib/auth/tokenStore';
import { authService } from '@/lib/auth/authService';

export function useIsAdmin(): boolean {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!tokenStore.getTokens()?.accessToken);
    return tokenStore.subscribe((tokens) => {
      setIsAuthenticated(!!tokens?.accessToken);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      try {
        const profile = await authService.getMe();
        const hasAdminRole = profile.roles?.some((role) => role.toLowerCase().includes('admin'));
        if (isMounted) setIsAdmin(!!hasAdminRole);
      } catch {
        if (isMounted) setIsAdmin(false);
      }
    };

    if (isAuthenticated) {
      checkAdmin();
    } else {
      setIsAdmin(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  return isAdmin;
}
