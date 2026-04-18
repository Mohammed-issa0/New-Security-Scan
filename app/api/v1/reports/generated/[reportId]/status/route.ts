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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;

  if (!reportId) {
    return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
  }

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL(`/api/v1/reports/generated/${encodeURIComponent(reportId)}/status`, backendBase);

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
    const responseBody = safeJsonParse(text, {});
    return NextResponse.json(responseBody, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: 'Async report status unavailable' }, { status: 502 });
  }
}
