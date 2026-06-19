import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders, getBackendBase, safeJsonParse } from '../../_backend-proxy';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await context.params;
  const backendUrl = new URL(`/api/v1/reports/${encodeURIComponent(scanId)}`, getBackendBase());

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: createBackendHeaders(request),
      cache: 'no-store',
    });

    if (backendResponse.status === 404 || backendResponse.status === 400) {
      return NextResponse.json(null);
    }

    const text = await backendResponse.text();
    const responseBody = safeJsonParse(text, null);
    return NextResponse.json(responseBody, { status: backendResponse.status });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown fetch error';
    console.error('[proxy] scan report failed', {
      backendUrl: backendUrl.toString(),
      reason,
    });

    return NextResponse.json({ error: 'Scan report unavailable' }, { status: 502 });
  }
}
