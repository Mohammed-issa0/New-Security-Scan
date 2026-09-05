import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders, getBackendBase, safeJsonParse } from '@/app/api/v1/_backend-proxy';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ jiraAccountId: string }> }
) {
  const { jiraAccountId } = await context.params;
  const payload = await request.json().catch(() => null);

  if (!jiraAccountId) {
    return NextResponse.json({ error: 'jiraAccountId is required' }, { status: 400 });
  }

  if (!payload?.customRole) {
    return NextResponse.json({ error: 'customRole is required' }, { status: 400 });
  }

  const backendUrl = new URL(
    `/api/v1/jira/oauth/developers/${encodeURIComponent(jiraAccountId)}/role`,
    getBackendBase()
  );

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'PUT',
      headers: createBackendHeaders(request, true),
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const body = safeJsonParse(text, {});
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: 'Jira OAuth developer role update unavailable' }, { status: 502 });
  }
}
