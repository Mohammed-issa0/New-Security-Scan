export interface ExtraCreditRules {
  price_cents: number;
  currency?: string | null;
  expires_in_months: number;
  min_consumed_percent: number;
  max_purchases_per_plan: number;
}

export interface PlanRestrictions {
  allow_auth_scanning?: boolean;
  allow_bruteforce?: boolean;
}

export interface PlanToolProfile {
  enabled?: boolean;
}

export interface PlanPublicResponse {
  planName?: string | null;
  displayName?: string | null;
  priceCents: number;
  currency?: string | null;
  includedScanCredits: number;
  maxRuntimeMinutes: number;
  maxConcurrentScans?: number;
  max_concurrent_scans?: number;
  enabledTools?: string[] | null;
  allowed_tools?: string[] | null;
  max_runtime_minutes?: number;
  tools?: Record<string, PlanToolProfile> | null;
  expiresInMonths: number;
  extraCredit?: ExtraCreditRules;
  restrictions?: PlanRestrictions;
}

export interface ActivePlanResponse {
  userPlanId: string;
  planName?: string | null;
  purchasedAt: string;
  expiresAt: string;
  includedCredits: number;
  includedCreditsUsed: number;
  extraCreditsAvailable: number;
  extraCreditsExpiredUnused: number;
  remainingCredits: number;
  extraPurchaseCount: number;
  canBuyExtraCredit: boolean;
  cannotBuyExtraCreditReason?: string | null;
  maxRuntimeMinutes?: number;
  max_runtime_minutes?: number;
  enabledTools?: string[] | null;
  allowed_tools?: string[] | null;
  restrictions?: PlanRestrictions;
  tools?: Record<string, PlanToolProfile> | null;
}

export interface CheckoutSessionResponse {
  url?: string | null;
}

export interface PurchasePlanResponse {
  success: boolean;
  message?: string | null;
  planId?: string;
  planName?: string | null;
  expiresAt?: string;
  includedCredits?: number;
}

export interface PurchaseExtraScanResponse {
  success: boolean;
  message?: string | null;
  extraScanId?: string;
  remainingExtraPurchases?: number;
  userPlanId?: string;
}
