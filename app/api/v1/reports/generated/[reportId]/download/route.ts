import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_BASE = 'https://backend.blackbrains.tech';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params;
  const incomingUrl = new URL(request.url);
  const format = incomingUrl.searchParams.get('format') || 'Pdf';

  if (!reportId) {
    return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
  }

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL(`/api/v1/reports/generated/${encodeURIComponent(reportId)}/download`, backendBase);
  backendUrl.searchParams.set('format', format);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: request.headers.get('authorization') || '',
      },
      cache: 'no-store',
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: backendResponse.headers,
    });
  } catch {
    return NextResponse.json({ error: 'Async report download unavailable' }, { status: 502 });
  }
}
