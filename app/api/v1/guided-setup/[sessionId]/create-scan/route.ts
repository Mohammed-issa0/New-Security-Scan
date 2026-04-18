import { NextRequest } from 'next/server';

import { enforceConcurrentScanLimit, proxyBackendRequest } from '../../../_scan-concurrency';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;

  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const limitCheck = await enforceConcurrentScanLimit(request);
  if (!limitCheck.allowed) {
    return limitCheck.response;
  }

  const body = await request.text();
  return proxyBackendRequest(request, `/api/v1/guided-setup/${encodeURIComponent(sessionId)}/create-scan`, body);
}