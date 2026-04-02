'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppErrorFallback from '@/components/common/AppErrorFallback';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isArabic = useMemo(() => pathname?.startsWith('/ar'), [pathname]);

  useEffect(() => {
    console.error('Route segment error', error);
  }, [error]);

  const content = isArabic
    ? {
        title: 'حدث خطأ غير متوقع',
        description: 'تم احتواء الخطأ داخل هذه الصفحة دون إيقاف الموقع بالكامل. يمكنك إعادة المحاولة أو الرجوع للصفحة الرئيسية.',
        retryLabel: 'إعادة المحاولة',
        homeLabel: 'العودة للرئيسية',
      }
    : {
        title: 'Something went wrong on this page',
        description: 'The error was contained to this route, so the rest of the site is still available. You can retry or return to the homepage.',
        retryLabel: 'Retry',
        homeLabel: 'Back to home',
      };

  return (
    <main className="app-shell app-shell--content">
      <AppErrorFallback
        title={content.title}
        description={content.description}
        errorId={error.digest}
        retryLabel={content.retryLabel}
        homeLabel={content.homeLabel}
        onRetry={reset}
        onHome={() => router.push(isArabic ? '/ar' : '/en')}
      />
    </main>
  );
}
