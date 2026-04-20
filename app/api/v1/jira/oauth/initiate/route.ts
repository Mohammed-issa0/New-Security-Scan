import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders, getBackendBase, safeJsonParse } from '@/app/api/v1/_backend-proxy';

function getFrontendOrigin(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '');
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
  return `${forwardedProto}://${forwardedHost}`;
}

function normalizeAuthorizationUrl(authorizationUrl: string, frontendOrigin: string) {
  try {
    const url = new URL(authorizationUrl);
    url.searchParams.set('redirect_uri', `${frontendOrigin}/api/v1/jira/oauth/callback`);
    return url.toString();
  } catch {
    return authorizationUrl;
  }
}

export async function GET(request: NextRequest) {
  const backendUrl = new URL('/api/v1/jira/oauth/initiate', getBackendBase());

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: createBackendHeaders(request, false, {
        Accept: 'application/json',
      }),
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const body = safeJsonParse(text, {}) as Record<string, unknown>;

    if (typeof body.authorizationUrl === 'string' && body.authorizationUrl.length > 0) {
      const frontendOrigin = getFrontendOrigin(request);
      body.authorizationUrl = normalizeAuthorizationUrl(body.authorizationUrl, frontendOrigin);
    }

    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: 'Jira OAuth initiate unavailable' }, { status: 502 });
  }
}
