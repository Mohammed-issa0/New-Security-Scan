import type { Scan } from '@/lib/api/types';
import type { PlanPublicResponse } from '@/lib/plans/types';
import { isActiveScanStatus, normalizeScanStatus } from './scanStatus';

export function getPlanMaxConcurrentScans(plan?: PlanPublicResponse | null): number {
  const rawValue = plan?.maxConcurrentScans ?? plan?.max_concurrent_scans ?? 0;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function countActiveScans(scans: Scan[]): number {
  return scans.filter((scan) => isActiveScanStatus(normalizeScanStatus(scan.status))).length;
}
