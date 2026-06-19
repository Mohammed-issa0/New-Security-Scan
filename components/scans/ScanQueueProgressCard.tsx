'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Zap } from 'lucide-react';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { formatDuration, remainingSecondsUntil } from '@/lib/scans/formatDuration';
import { normalizeScanStatus } from '@/lib/scans/scanStatus';
import type { ScanQueueProgressSource } from '@/lib/scans/useScanQueueEstimate';

interface ScanQueueProgressCardProps {
  source: ScanQueueProgressSource;
  variant?: 'compact' | 'full';
  className?: string;
}

export function ScanQueueProgressCard({
  source,
  variant = 'full',
  className = '',
}: ScanQueueProgressCardProps) {
  const t = useTranslations('landing.scans.queueEstimate');
  const status = normalizeScanStatus(source.status);
  const isRunning = status === 'Running';
  const isPending = status === 'Pending';
  const queuePosition = source.queuePosition ?? 0;
  const progressPercent = source.progressPercent ?? 0;
  const waitLabel = formatDuration(source.estimatedWaitSeconds);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowTick((value) => value + 1);
    }, 10_000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  const remainingSeconds = useMemo(
    () => remainingSecondsUntil(source.estimatedFinishAt),
    [source.estimatedFinishAt, nowTick]
  );
  const remainingLabel = formatDuration(remainingSeconds);

  if (!isPending && !isRunning) {
    return null;
  }

  const isCompact = variant === 'compact';

  return (
    <div
      className={`${
        isCompact
          ? 'space-y-1.5'
          : 'rounded-xl border border-white/12 bg-white/5 p-4 space-y-3'
      } ${className}`}
    >
      <div className={`flex flex-wrap items-center gap-2 ${isCompact ? 'text-xs' : 'text-sm'}`}>
        {isPending ? (
          <>
            <Clock className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-status-warning`} />
            <span className="text-text-secondary">
              {t('estimatedStart', { duration: waitLabel })}
            </span>
            {queuePosition > 0 ? (
              <span className="rounded-full border border-status-warning/30 bg-status-warning/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-warning">
                {t('position', { position: queuePosition })}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <Zap className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-cyan-300`} />
            <span className="text-text-secondary">
              {queuePosition === 0
                ? t('runningRemaining', { duration: remainingLabel })
                : t('currentlyRunning')}
            </span>
          </>
        )}
      </div>

      <AnimatedProgressBar
        value={progressPercent}
        showLabel={!isCompact}
        className={isCompact ? 'text-[10px]' : ''}
      />
    </div>
  );
}
