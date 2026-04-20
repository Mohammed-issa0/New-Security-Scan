import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_BASE = 'https://backend.blackbrains.tech';

function buildFrontendSettingsRedirect(options: {
  incomingUrl: URL;
  location?: string | null;
  fallbackQuery: string;
}) {
  const { incomingUrl, location, fallbackQuery } = options;

  const fallback = new URL(`/settings/jira?${fallbackQuery}`, incomingUrl.origin);
  if (!location) {
    return fallback;
  }

  try {
    const parsedLocation = new URL(location, incomingUrl.origin);
    const path = parsedLocation.pathname;
    const isSettingsRoute =
      path === '/settings/jira' ||
      path === '/en/settings/jira' ||
      path === '/ar/settings/jira';

    if (!isSettingsRoute) {
      return fallback;
    }

    return new URL(`${path}${parsedLocation.search}`, incomingUrl.origin);
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const incomingUrl = new URL(request.url);
  const query = incomingUrl.searchParams;

  const code = query.get('code');
  const state = query.get('state');
  const error = query.get('error');

  // OAuth callback requires at least one expected query parameter.
  if (!code && !state && !error) {
    return NextResponse.redirect(
      buildFrontendSettingsRedirect({
        incomingUrl,
        fallbackQuery: 'error=missing_callback_params',
      })
    );
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
      return NextResponse.redirect(
        buildFrontendSettingsRedirect({
          incomingUrl,
          location,
          fallbackQuery: 'connected=true',
        })
      );
    }

    if (backendResponse.ok) {
      return NextResponse.redirect(
        buildFrontendSettingsRedirect({
          incomingUrl,
          fallbackQuery: 'connected=true',
        })
      );
    }

    return NextResponse.redirect(
      buildFrontendSettingsRedirect({
        incomingUrl,
        fallbackQuery: 'error=callback_failed',
      })
    );
  } catch {
    return NextResponse.redirect(
      buildFrontendSettingsRedirect({
        incomingUrl,
        fallbackQuery: 'error=callback_unreachable',
      })
    );
  }
}
