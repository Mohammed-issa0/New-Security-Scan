'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppErrorFallback from '@/components/common/AppErrorFallback';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Global application error', error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_40%),linear-gradient(180deg,#050b16,#070f1d_55%,#091427)] p-4 sm:p-8">
        <AppErrorFallback
          title="Unexpected application error"
          description="A critical error occurred, but the app is still running. You can retry this view or go back to the homepage."
          errorId={error.digest}
          retryLabel="Try again"
          homeLabel="Go to home"
          onRetry={reset}
          onHome={() => router.push('/')}
        />
      </body>
    </html>
  );
}
