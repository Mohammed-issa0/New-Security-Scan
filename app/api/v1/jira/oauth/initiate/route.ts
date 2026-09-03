import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders, getBackendBase, safeJsonParse } from '@/app/api/v1/_backend-proxy';

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

    // The authorizationUrl is returned verbatim on purpose. Its redirect_uri is
    // registered against the API host, and its state is single-use and bound to
    // the user's session server-side — rewriting either breaks the consent screen
    // and the CSRF protection.
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: 'Jira OAuth initiate unavailable' }, { status: 502 });
  }
}
