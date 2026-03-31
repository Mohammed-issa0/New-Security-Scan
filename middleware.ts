import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en'
});

const getLocaleFromPath = (pathname: string) => {
  const segment = pathname.split('/')[1];
  return segment === 'ar' || segment === 'en' ? segment : 'en';
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const hasAdminClaim = (payload: Record<string, unknown> | null) => {
  if (!payload) {
    return null;
  }

  const rawRoles = [
    payload.role,
    payload.roles,
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
  ];

  const normalizedRoles = rawRoles
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .filter((item): item is string => typeof item === 'string')
    .map((role) => role.toLowerCase());

  if (normalizedRoles.length === 0) {
    return null;
  }

  return normalizedRoles.some((role) => role.includes('admin'));
};

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = getLocaleFromPath(pathname);
  const isAdminPath = /^\/(ar|en)\/admin(\/|$)/.test(pathname);

  if (!isAdminPath) {
    return intlMiddleware(request);
  }

  const token = request.cookies.get('auth_access_token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const adminClaim = hasAdminClaim(decodeJwtPayload(decodeURIComponent(token)));
  if (adminClaim === false) {
    return NextResponse.redirect(new URL(`/${locale}/scans`, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(ar|en)/:path*']
};



