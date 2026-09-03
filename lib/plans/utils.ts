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

const PLAN_TIER_LABELS = {
  free: { en: 'Free', ar: 'مجاني' },
  basic: { en: 'Basic', ar: 'أساسي' },
  professional: { en: 'Professional', ar: 'احترافي' },
  advanced: { en: 'Advanced', ar: 'متقدم' },
} as const;

type PlanTier = keyof typeof PLAN_TIER_LABELS;

// The backend only sends plan names/display names in English. Recognized tiers
// get a localized label; anything unrecognized falls back to the raw API text.
function detectPlanTier(name: string): PlanTier | null {
  const key = name.trim().toLowerCase();
  if (key.includes('advanced')) return 'advanced';
  if (key.includes('professional') || key.includes('pro')) return 'professional';
  if (key.includes('basic')) return 'basic';
  if (key.includes('free')) return 'free';
  return null;
}

export function getLocalizedPlanName(
  plan: { planName?: string | null; displayName?: string | null } | null | undefined,
  locale: string
) {
  const rawName = getPlanDisplayName(plan);
  if (!rawName) return null;

  const tier = detectPlanTier(rawName);
  if (!tier) return rawName;

  return PLAN_TIER_LABELS[tier][locale === 'ar' ? 'ar' : 'en'];
}

// ICU spells USD as "US$" in Arabic; this pulls the international narrow symbol
// ("$", "€", ...) so prices read as "45 $" instead of "45 US$". Currencies with no
// narrow symbol (e.g. SAR) keep their code, which is the correct display for them.
function getNarrowCurrencySymbol(currency: string) {
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency
  );
}

export function formatPlanPrice(
  priceCents: number,
  currency: string | null | undefined,
  locale: string
) {
  const currencyCode = (currency || 'USD').toUpperCase();
  const symbol = getNarrowCurrencySymbol(currencyCode);

  // Keep the locale's own grouping and symbol placement, swap only the symbol itself.
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
  })
    .formatToParts(priceCents / 100)
    .map((part) => (part.type === 'currency' ? symbol : part.value))
    .join('');
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
