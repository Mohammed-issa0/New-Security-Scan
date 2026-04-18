import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_BASE = 'https://backend.blackbrains.tech';

export async function GET(request: NextRequest) {
  const incomingUrl = new URL(request.url);
  const query = incomingUrl.searchParams;

  const code = query.get('code');
  const state = query.get('state');
  const error = query.get('error');

  // OAuth callback requires at least one expected query parameter.
  if (!code && !state && !error) {
    return NextResponse.redirect(new URL('/settings/jira?error=missing_callback_params', incomingUrl));
  }

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendCallbackUrl = new URL('/api/v1/jira/oauth/callback', backendBase);
  backendCallbackUrl.search = query.toString();

  try {
    const backendResponse = await fetch(backendCallbackUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'Accept': 'text/plain,application/json,*/*',
      },
      cache: 'no-store',
    });

    const location = backendResponse.headers.get('location');
    if (location) {
      return NextResponse.redirect(new URL(location, incomingUrl.origin));
    }

    if (backendResponse.ok) {
      return NextResponse.redirect(new URL('/settings/jira?connected=true', incomingUrl));
    }

    return NextResponse.redirect(new URL('/settings/jira?error=callback_failed', incomingUrl));
  } catch {
    return NextResponse.redirect(new URL('/settings/jira?error=callback_unreachable', incomingUrl));
  }
}
