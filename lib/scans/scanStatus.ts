import type { ScanStatus } from '@/lib/api/types';

const KNOWN_STATUSES: ScanStatus[] = [
  'Pending',
  'Running',
  'Completed',
  'Failed',
  'Canceled',
  'CompletedWithLimits',
];

export function normalizeScanStatus(value: unknown): ScanStatus | 'Unknown' {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const exact = KNOWN_STATUSES.find((status) => status === trimmed);
    if (exact) {
      return exact;
    }

    const caseInsensitive = KNOWN_STATUSES.find(
      (status) => status.toLowerCase() === trimmed.toLowerCase()
    );
    return caseInsensitive ?? 'Unknown';
  }

  if (typeof value === 'number') {
    const map: Record<number, ScanStatus> = {
      1: 'Pending',
      2: 'Running',
      3: 'Completed',
      4: 'Failed',
      5: 'Canceled',
      6: 'CompletedWithLimits',
    };
    return map[value] ?? 'Unknown';
  }

  return 'Unknown';
}

export function isActiveScanStatus(status: ScanStatus | 'Unknown'): boolean {
  return status === 'Pending' || status === 'Running';
}

export function isTerminalScanStatus(status: ScanStatus | 'Unknown'): boolean {
  return status !== 'Unknown' && !isActiveScanStatus(status);
}

/**
 * A scan is marked Failed when *any* tool fails, yet the tools that succeeded
 * still recorded findings and a report can still be generated from them — so
 * Failed scans carry results too, and only Canceled ones never do.
 */
export function hasScanResults(status: ScanStatus | 'Unknown'): boolean {
  return status === 'Completed' || status === 'CompletedWithLimits' || status === 'Failed';
}

export function getScanStatusTranslationKey(status: unknown): string {
  const normalized = normalizeScanStatus(status);
  const key = normalized.toLowerCase();
  return ['pending', 'running', 'completed', 'completedwithlimits', 'failed', 'canceled'].includes(key)
    ? key
    : 'unknown';
}

export const scanStatusClassMap: Record<string, string> = {
  Pending: 'border border-status-warning/30 bg-status-warning/14 text-status-warning',
  Running: 'border border-cyan-300/30 bg-cyan-400/14 text-cyan-200',
  Completed: 'border border-status-success/28 bg-status-success/14 text-status-success',
  CompletedWithLimits: 'border border-status-warning/30 bg-status-warning/14 text-status-warning',
  Failed: 'border border-status-danger/30 bg-status-danger/14 text-status-danger',
  Canceled: 'border border-white/14 bg-white/8 text-text-secondary',
  Unknown: 'border border-white/14 bg-white/8 text-text-secondary',
};

import { getRememberedScanName } from './scanNameCache';

export function getScanDisplayName(scan: { id: string; name?: string | null }): string | null {
  const record = scan as Record<string, unknown>;
  const candidate = scan.name ?? record.Name ?? record.name;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim();
  }

  return getRememberedScanName(scan.id);
}
