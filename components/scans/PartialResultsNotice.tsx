'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Scan } from '@/lib/api/types';

type PartialResultsNoticeProps = {
  scan?: Pick<Scan, 'partialResults' | 'toolsTotal' | 'toolsFailed' | 'failureReason'> | null;
  className?: string;
};

/**
 * A scan is marked Failed when *any* tool fails, but the tools that succeeded
 * still produced findings. This labels those results honestly instead of letting
 * a "Low Risk - 4 findings" report imply full coverage.
 */
export function PartialResultsNotice({ scan, className = '' }: PartialResultsNoticeProps) {
  const t = useTranslations('landing.scans.details.partialResults');

  if (!scan?.partialResults) {
    return null;
  }

  const total = scan.toolsTotal ?? 0;
  const failed = scan.toolsFailed ?? 0;

  return (
    <div
      className={`rounded-2xl border border-status-warning/30 bg-status-warning/12 p-4 text-sm text-status-warning ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">{t('title')}</p>
          <p>{total > 0 && failed > 0 ? t('description', { failed, total }) : t('descriptionGeneric')}</p>
          {scan.failureReason && <p className="text-text-secondary">{scan.failureReason}</p>}
        </div>
      </div>
    </div>
  );
}
