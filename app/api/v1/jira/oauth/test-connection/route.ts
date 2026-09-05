import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders, getBackendBase, safeJsonParse } from '@/app/api/v1/_backend-proxy';

export async function POST(request: NextRequest) {
  const incomingUrl = new URL(request.url);
  const cloudId = incomingUrl.searchParams.get('cloudId');

  if (!cloudId) {
    return NextResponse.json({ error: 'cloudId is required' }, { status: 400 });
  }

  const backendUrl = new URL('/api/v1/jira/oauth/test-connection', getBackendBase());
  backendUrl.searchParams.set('cloudId', cloudId);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: createBackendHeaders(request),
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const body = safeJsonParse(text, {});
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { error: 'Jira OAuth connection test unavailable', errorMessage: 'Gateway connection failed.' },
      { status: 502 }
    );
  }
}
