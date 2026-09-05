import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders, getBackendBase, safeJsonParse } from '@/app/api/v1/_backend-proxy';

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  if (!payload?.cloudId || !payload?.jiraAccountId) {
    return NextResponse.json({ error: 'cloudId and jiraAccountId are required' }, { status: 400 });
  }

  const backendUrl = new URL('/api/v1/jira/oauth/developers/verify', getBackendBase());

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: createBackendHeaders(request, true),
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const body = safeJsonParse(text, {});
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: 'Jira OAuth developer verification unavailable' }, { status: 502 });
  }
}
