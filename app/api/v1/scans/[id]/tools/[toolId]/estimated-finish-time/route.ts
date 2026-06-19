import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders, getBackendBase, safeJsonParse } from '../../../../../_backend-proxy';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; toolId: string }> }
) {
  const { id, toolId } = await context.params;
  const backendUrl = new URL(
    `/api/v1/scans/${encodeURIComponent(id)}/tools/${encodeURIComponent(toolId)}/estimated-finish-time`,
    getBackendBase()
  );

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: createBackendHeaders(request),
      cache: 'no-store',
    });

    if (backendResponse.status === 404) {
      return NextResponse.json(null);
    }

    const text = await backendResponse.text();
    const responseBody = safeJsonParse(text, null);
    return NextResponse.json(responseBody, { status: backendResponse.status });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown fetch error';
    console.error('[proxy] tool estimated-finish-time failed', {
      backendUrl: backendUrl.toString(),
      reason,
    });

    return NextResponse.json({ error: 'Tool ETA unavailable' }, { status: 502 });
  }
}
