import type { ApiError } from '@/lib/api/client';

export type ScanErrorAction =
  | 'inline_credit_budget'
  | 'inline_concurrent'
  | 'redirect_billing'
  | 'redirect_plans'
  | 'hide_add_credits'
  | 'toast_refund'
  | 'toast_generic';

export interface ParsedScanError {
  message: string;
  action: ScanErrorAction;
}

/** What the user sees: `error` is the backend's localized label. */
function getDisplayText(data?: ApiError, fallback = 'Request failed'): string {
  return (data?.error || data?.detail || data?.message || fallback).trim();
}

/**
 * What we classify on. The rules below match English phrases, and `message` is
 * the backend's untranslated diagnostic field — so matching against everything
 * keeps the rules working once `error` comes back in Arabic.
 */
function getMatchText(data?: ApiError, fallback = ''): string {
  return [data?.message, data?.detail, data?.error, fallback]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function parseScanCreateError(data?: ApiError, fallback?: string): ParsedScanError {
  const message = getDisplayText(data, fallback);
  const lower = getMatchText(data, fallback);

  if (lower.includes('credit_budget must be between')) {
    return { message, action: 'inline_credit_budget' };
  }

  if (lower.includes('not enough scan credits')) {
    return { message, action: 'inline_credit_budget' };
  }

  if (
    lower.includes('concurrent') &&
    (lower.includes('limit') || lower.includes('active scan'))
  ) {
    return { message, action: 'inline_concurrent' };
  }

  if (lower.includes('no scan credits remaining')) {
    return { message, action: 'redirect_billing' };
  }

  if (lower.includes('does not allow authenticated scanning')) {
    return { message, action: 'toast_generic' };
  }

  return { message, action: 'toast_generic' };
}

export function parseAddCreditsError(data?: ApiError, fallback?: string): ParsedScanError {
  const message = getDisplayText(data, fallback);
  const lower = getMatchText(data, fallback);

  if (lower.includes('completed while credits were being added')) {
    return { message, action: 'toast_refund' };
  }

  if (lower.includes('already finished') || lower.includes('terminal state')) {
    return { message, action: 'hide_add_credits' };
  }

  if (lower.includes('cannot exceed 4') || lower.includes('total credit budget')) {
    return { message, action: 'hide_add_credits' };
  }

  if (lower.includes('not enough scan credits') || lower.includes('insufficient credits')) {
    return { message, action: 'redirect_billing' };
  }

  return { message, action: 'toast_generic' };
}
