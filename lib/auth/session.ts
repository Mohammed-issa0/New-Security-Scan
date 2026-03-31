'use client';

export type SessionEndReason = 'logout' | 'expired' | 'refresh_failed';

const SUPPORTED_LOCALES = ['en', 'ar'] as const;

function detectLocaleFromPath(pathname: string): string {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (firstSegment && SUPPORTED_LOCALES.includes(firstSegment as (typeof SUPPORTED_LOCALES)[number])) {
    return firstSegment;
  }
  return 'en';
}

export function getLoginPath(): string {
  if (typeof window === 'undefined') {
    return '/en/login';
  }

  const locale = detectLocaleFromPath(window.location.pathname);
  return `/${locale}/login`;
}

export function clearSensitiveBrowserData() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('auth_tokens');
  sessionStorage.removeItem('auth_tokens');
}

export function notifySessionEnded(reason: SessionEndReason) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('auth:session-ended', { detail: { reason } }));
}

export function redirectToLogin(reason: SessionEndReason) {
  if (typeof window === 'undefined') {
    return;
  }

  const loginPath = getLoginPath();
  const isAlreadyOnLogin = window.location.pathname.endsWith('/login');
  if (isAlreadyOnLogin) {
    return;
  }

  const url = new URL(loginPath, window.location.origin);
  url.searchParams.set('reason', reason);
  window.location.assign(url.toString());
}
