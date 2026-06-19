'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scansService } from './scansService';
import { usePageVisibility } from '@/lib/hooks/usePageVisibility';
import { getQueueEstimatePollInterval } from './queuePolling';
import { isActiveScanStatus, normalizeScanStatus } from './scanStatus';
import type { ScanQueueEstimate } from '@/lib/api/types';

export const scanQueueEstimateQueryKey = (scanId: string) =>
  ['scan-queue-estimate', scanId] as const;

interface UseScanQueueEstimateOptions {
  scanId: string;
  enabled?: boolean;
}

export function useScanQueueEstimate({ scanId, enabled = true }: UseScanQueueEstimateOptions) {
  const queryClient = useQueryClient();
  const isPageVisible = usePageVisibility();

  const query = useQuery({
    queryKey: scanQueueEstimateQueryKey(scanId),
    queryFn: () => scansService.getQueueEstimate(scanId),
    enabled: enabled && !!scanId,
    refetchInterval: (currentQuery) => {
      if (!isPageVisible) {
        return false;
      }

      return getQueueEstimatePollInterval(currentQuery.state.data ?? undefined);
    },
    staleTime: 5_000,
  });

  useEffect(() => {
    if (query.data === null) {
      void queryClient.invalidateQueries({ queryKey: ['scan', scanId] });
      void queryClient.invalidateQueries({ queryKey: ['scans'] });
    }
  }, [query.data, queryClient, scanId]);

  return query;
}

export function scanHasQueueFields(scan: {
  status: unknown;
  queuePosition?: number | null;
  estimatedWaitSeconds?: number | null;
  progressPercent?: number | null;
  estimatedFinishAt?: string | null;
}): boolean {
  const status = normalizeScanStatus(scan.status);
  return (
    isActiveScanStatus(status) &&
    (scan.queuePosition != null ||
      scan.estimatedWaitSeconds != null ||
      scan.progressPercent != null ||
      scan.estimatedFinishAt != null)
  );
}

export type ScanQueueProgressSource = {
  status: ScanQueueEstimate['status'] | string;
  queuePosition?: number | null;
  estimatedWaitSeconds?: number | null;
  estimatedFinishAt?: string | null;
  progressPercent?: number | null;
};
