import type { ScanProfile } from '@/lib/api/types';
import type { ScanRecommendation } from '@/lib/api/types';
import { getCreditMinutesPerUnit, getMaxCreditBudget } from '@/lib/plans/creditBudget';

export function inferProfileFromRecommendation(
  recommendation: ScanRecommendation
): ScanProfile {
  const minutes = recommendation.estimated_minutes ?? 60;
  if (minutes <= 25) return 'recon';
  if (minutes <= 45) return 'quick';
  if (minutes <= 120) return 'standard';
  return 'deep';
}

export function inferCreditBudgetFromRecommendation(
  recommendation: ScanRecommendation,
  planName?: string | null
): number {
  const minutesPerCredit = getCreditMinutesPerUnit(planName);
  const estimatedMinutes = Math.max(minutesPerCredit, recommendation.estimated_minutes ?? minutesPerCredit);
  const budget = Math.max(1, Math.ceil(estimatedMinutes / minutesPerCredit));
  return Math.min(getMaxCreditBudget(planName), budget);
}
