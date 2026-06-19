'use client';

import { useTranslations } from 'next-intl';
import type { ScanStatus } from '@/lib/api/types';
import { Badge } from './ui';
import { isActiveScanStatus, normalizeScanStatus } from '@/lib/scans/scanStatus';

interface ScanCreditsDisplayProps {
  status: ScanStatus | string | number | unknown;
  creditBudget?: number;
  creditsConsumed?: number | null;
  compact?: boolean;
}

export function ScanCreditsDisplay({
  status,
  creditBudget = 1,
  creditsConsumed,
  compact = false,
}: ScanCreditsDisplayProps) {
  const t = useTranslations('landing.scans.credits');
  const normalizedStatus = normalizeScanStatus(status);
  const budget = creditBudget ?? 1;

  if (normalizedStatus === 'Unknown') {
    return null;
  }

  if (isActiveScanStatus(normalizedStatus)) {
    return (
      <span className={compact ? 'text-xs text-text-muted' : 'text-sm text-text-secondary'}>
        {t('allocated', { count: budget })}
      </span>
    );
  }

  if (creditsConsumed == null) {
    return (
      <span className={compact ? 'text-xs text-text-muted' : 'text-sm text-text-secondary'}>
        {t('allocated', { count: budget })}
      </span>
    );
  }

  const refunded = Math.max(0, budget - creditsConsumed);

  if (refunded > 0) {
    return (
      <span className={`inline-flex flex-wrap items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className="text-text-secondary">
          {t('usedWithRefund', { used: creditsConsumed, refunded })}
        </span>
        <Badge variant="success" className="text-[10px]">
          {t('refundBadge', { count: refunded })}
        </Badge>
      </span>
    );
  }

  return (
    <span className={compact ? 'text-xs text-text-muted' : 'text-sm text-text-secondary'}>
      {t('used', { count: creditsConsumed })}
    </span>
  );
}
