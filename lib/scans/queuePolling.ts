import type { ScanQueueEstimate } from '@/lib/api/types';
import { normalizeScanStatus } from './scanStatus';

export function getQueueEstimatePollInterval(
  estimate: ScanQueueEstimate | null | undefined
): number | false {
  if (!estimate) {
    return false;
  }

  const status = normalizeScanStatus(estimate.status);
  if (status === 'Running') {
    return 10_000;
  }

  if (status === 'Pending') {
    const position = estimate.queuePosition ?? 0;
    return position >= 4 ? 30_000 : 15_000;
  }

  return false;
}
