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

export async function GET(request: NextRequest) {
  const incomingUrl = new URL(request.url);
  const cloudId = incomingUrl.searchParams.get('cloudId');
  const q = incomingUrl.searchParams.get('q');

  if (!cloudId) {
    return NextResponse.json({ error: 'cloudId is required' }, { status: 400 });
  }

  if (!q) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 });
  }

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL('/api/v1/jira/oauth/developers/search', backendBase);
  backendUrl.searchParams.set('cloudId', cloudId);
  backendUrl.searchParams.set('q', q);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: request.headers.get('authorization') || '',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const body = safeJsonParse(text, []);
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: 'Jira OAuth developer search unavailable' }, { status: 502 });
  }
}
