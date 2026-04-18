import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_BASE = 'https://backend.blackbrains.tech';

function safeJsonParse(text: string, fallback: unknown) {
  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

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

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL(
    `/api/v1/jira/oauth/developers/${encodeURIComponent(jiraAccountId)}/role`,
    backendBase
  );

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'PUT',
      headers: {
        Authorization: request.headers.get('authorization') || '',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
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
