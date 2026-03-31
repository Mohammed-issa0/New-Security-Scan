'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { authService } from '@/lib/auth/authService';
import { toast } from 'sonner';

const isAdminRole = (roles?: string[]) => {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => role.toLowerCase().includes('admin'));
};

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('admin.guard');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      try {
        const profile = await authService.getMe();
        if (!isAdminRole(profile.roles)) {
          toast.error(t('accessDenied'));
          router.replace(`/${locale}/scans`);
          return;
        }
        if (isMounted) setIsReady(true);
      } catch (error) {
        router.replace(`/${locale}/login`);
      }
    };

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [locale, router, t]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
