'use client';

import Link from 'next/link';
import { AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface ScanStatusBannerProps {
  limitMessage?: string | null;
  failureReason?: string | null;
  targetId?: string;
}

function isLoginUrlFailure(reason?: string | null): boolean {
  if (!reason) return false;
  return reason.toLowerCase().includes('login url');
}

export function ScanStatusBanner({
  limitMessage,
  failureReason,
  targetId,
}: ScanStatusBannerProps) {
  const td = useTranslations('landing.scans.details.banners');
  const locale = useLocale();
  const loginUrlFailure = isLoginUrlFailure(failureReason);
  const otherFailure = failureReason && !loginUrlFailure;

  return (
    <>
      {limitMessage ? (
        <div className="rounded-xl border border-status-warning/35 bg-status-warning/12 p-4 text-sm text-status-warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>{limitMessage}</p>
          </div>
        </div>
      ) : null}

      {loginUrlFailure ? (
        <div className="rounded-xl border border-status-warning/35 bg-status-warning/12 p-4 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-status-warning">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{failureReason}</p>
            </div>
            {targetId ? (
              <Link
                href={`/${locale}/targets?browserAuth=${targetId}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-status-warning/35 bg-status-warning/16 px-3 py-2 text-xs font-semibold text-status-warning hover:bg-status-warning/22"
              >
                {td('loginUrlCta')}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {otherFailure ? (
        <details className="rounded-xl border border-white/12 bg-white/5 p-4 text-sm text-text-secondary">
          <summary className="cursor-pointer font-medium text-text-primary">
            {td('technicalDetails')}
          </summary>
          <p className="mt-2 whitespace-pre-wrap">{failureReason}</p>
        </details>
      ) : null}
    </>
  );
}
