import type { ActivePlanResponse, PlanPublicResponse, PlanToolProfile } from '@/lib/plans/types';

function toolsFromRecord(tools?: Record<string, PlanToolProfile> | null) {
  if (!tools) {
    return [];
  }

  return Object.entries(tools)
    .filter(([, profile]) => profile?.enabled !== false)
    .map(([toolName]) => toolName);
}

export function getPlanDisplayName(plan?: { planName?: string | null; displayName?: string | null } | null) {
  return plan?.displayName || plan?.planName || null;
}

export function getPlanTools(
  plan?: {
    enabledTools?: string[] | null;
    allowed_tools?: string[] | null;
    tools?: Record<string, PlanToolProfile> | null;
  } | null
) {
  const directTools = plan?.enabledTools?.filter(Boolean) || [];
  if (directTools.length > 0) {
    return directTools;
  }

  const allowedTools = plan?.allowed_tools?.filter(Boolean) || [];
  if (allowedTools.length > 0) {
    return allowedTools;
  }

  return toolsFromRecord(plan?.tools);
}

export function getCreditsUsagePercent(activePlan?: ActivePlanResponse | null) {
  if (!activePlan || activePlan.includedCredits <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((activePlan.includedCreditsUsed / activePlan.includedCredits) * 100));
}

export function findMatchingPlanDefinition(
  activePlan: ActivePlanResponse | null | undefined,
  plans: PlanPublicResponse[] | null | undefined
) {
  if (!activePlan?.planName || !plans?.length) {
    return null;
  }

  const activePlanName = activePlan.planName.trim().toLowerCase();
  return plans.find((plan) => plan.planName?.trim().toLowerCase() === activePlanName) || null;
}
