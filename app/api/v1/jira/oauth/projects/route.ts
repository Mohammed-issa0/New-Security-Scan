import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_BASE = 'https://backend.blackbrains.tech';

export async function GET(request: NextRequest) {
  const incomingUrl = new URL(request.url);
  const cloudId = incomingUrl.searchParams.get('cloudId');

  if (!cloudId) {
    return NextResponse.json({ error: 'cloudId is required' }, { status: 400 });
  }

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL('/api/v1/jira/oauth/projects', backendBase);
  backendUrl.searchParams.set('cloudId', cloudId);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const body = text ? JSON.parse(text) : [];
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { error: 'Jira OAuth projects unavailable' },
      { status: 502 }
    );
  }
}
