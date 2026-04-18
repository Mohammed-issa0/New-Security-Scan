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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!scanId) {
    return NextResponse.json({ error: 'scanId is required' }, { status: 400 });
  }

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL(`/api/v1/reports/${encodeURIComponent(scanId)}/generate`, backendBase);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: request.headers.get('authorization') || '',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const responseBody = safeJsonParse(text, {});
    return NextResponse.json(responseBody, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: 'Async report generation unavailable' }, { status: 502 });
  }
}
