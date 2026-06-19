export type ScanProfileName = 'recon' | 'quick' | 'standard' | 'deep';

const CREDIT_MINUTES_BY_PLAN: Record<string, number> = {
  basic: 30,
  professional: 60,
  advanced: 120,
};

export function getCreditMinutesPerUnit(planName?: string | null): number {
  const key = planName?.trim().toLowerCase() ?? '';
  if (key.includes('advanced')) return CREDIT_MINUTES_BY_PLAN.advanced;
  if (key.includes('professional') || key.includes('pro')) return CREDIT_MINUTES_BY_PLAN.professional;
  if (key.includes('basic')) return CREDIT_MINUTES_BY_PLAN.basic;
  return CREDIT_MINUTES_BY_PLAN.professional;
}

export function getMaxCreditBudget(planName?: string | null): number {
  const key = planName?.trim().toLowerCase() ?? '';
  return key.includes('advanced') ? 4 : 3;
}

export function getEstimatedDurationMinutes(
  planName: string | null | undefined,
  credits: number
): number {
  return getCreditMinutesPerUnit(planName) * Math.max(1, credits);
}

export function isProfileAllowedForPlan(
  profile: ScanProfileName,
  planName?: string | null,
  planTiers?: string[] | null
): boolean {
  if (!planTiers?.length) return true;
  const key = planName?.trim().toLowerCase() ?? '';
  const tier =
    key.includes('advanced') ? 'advanced' :
    key.includes('professional') || key.includes('pro') ? 'professional' :
    key.includes('basic') ? 'basic' :
    key;
  return planTiers.some((t) => t.toLowerCase() === tier);
}
