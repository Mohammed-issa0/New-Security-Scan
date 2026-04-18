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

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  if (!payload?.cloudId || !payload?.jiraAccountId) {
    return NextResponse.json({ error: 'cloudId and jiraAccountId are required' }, { status: 400 });
  }

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL('/api/v1/jira/oauth/developers/verify', backendBase);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'POST',
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
    return NextResponse.json({ error: 'Jira OAuth developer verification unavailable' }, { status: 502 });
  }
}
