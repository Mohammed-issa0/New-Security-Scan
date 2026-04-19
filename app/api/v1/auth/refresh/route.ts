import { NextRequest, NextResponse } from 'next/server';
import { forwardJsonToBackend } from '../../_backend-proxy';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid refresh payload' }, { status: 400 });
  }

  return forwardJsonToBackend({
    request,
    backendPath: '/api/v1/auth/refresh',
    method: 'POST',
    body: JSON.stringify(payload),
    fallback: {},
    unavailableMessage: 'Token refresh unavailable',
  });
}