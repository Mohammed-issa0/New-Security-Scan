'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { tokenStore } from '@/lib/auth/tokenStore';
import { useLocale } from 'next-intl';
import { clearSensitiveBrowserData } from '@/lib/auth/session';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const evaluateAccess = () => {
      const tokens = tokenStore.getTokens();
      const isAuthPage = pathname.includes('/login') || pathname.includes('/register');
      const refreshExpired = tokenStore.isRefreshTokenExpired();

      if (tokens && refreshExpired) {
        tokenStore.clear();
        clearSensitiveBrowserData();
      }

      const isAuthenticated = !!tokenStore.getTokens()?.accessToken;

      if (!isAuthenticated && !isAuthPage) {
        setIsReady(false);
        router.replace(`/${locale}/login`);
      } else if (isAuthenticated && isAuthPage) {
        setIsReady(false);
        router.replace(`/${locale}/scans`);
      } else {
        setIsReady(true);
      }
    };

    evaluateAccess();

    const unsubscribe = tokenStore.subscribe(() => {
      evaluateAccess();
    });

    const onSessionEnded = () => {
      evaluateAccess();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:session-ended', onSessionEnded);
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:session-ended', onSessionEnded);
      }
    };
  }, [pathname, router, locale]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}

