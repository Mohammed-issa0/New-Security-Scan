import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_BASE = 'https://backend.blackbrains.tech';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN?.trim() || '';

function getBackendBase() {
  return process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
}

function isAuthorizedInternalRequest(request: NextRequest) {
  const providedToken = request.headers.get('x-internal-service-token')?.trim() || '';

  if (!INTERNAL_SERVICE_TOKEN || !providedToken) {
    return false;
  }

  const expected = Buffer.from(INTERNAL_SERVICE_TOKEN);
  const provided = Buffer.from(providedToken);

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}

function buildBackendInternalUrl(resourcePath: string, scanId: string, tenantId: string | null) {
  const backendUrl = new URL(resourcePath.replace('{scanId}', encodeURIComponent(scanId)), getBackendBase());

  if (tenantId) {
    backendUrl.searchParams.set('tenantId', tenantId);
  }

  return backendUrl;
}

export async function proxyInternalScanRequest(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> },
  resourcePath: string
) {
  const { scanId } = await context.params;

  if (!scanId) {
    return NextResponse.json({ error: 'scanId is required' }, { status: 400 });
  }

  if (!isAuthorizedInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const incomingUrl = new URL(request.url);
  const tenantId = incomingUrl.searchParams.get('tenantId');
  const backendUrl = buildBackendInternalUrl(resourcePath, scanId, tenantId);
  const internalToken = request.headers.get('x-internal-service-token') || '';

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Internal-Service-Token': internalToken,
        Accept: request.headers.get('accept') || 'application/json',
      },
      cache: 'no-store',
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: backendResponse.headers,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal scan endpoint unavailable' },
      { status: 502 }
    );
  }
}