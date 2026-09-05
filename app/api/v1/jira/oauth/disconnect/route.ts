import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders, getBackendBase, safeJsonParse } from '@/app/api/v1/_backend-proxy';

export async function DELETE(request: NextRequest) {
  const backendUrl = new URL('/api/v1/jira/oauth/disconnect', getBackendBase());

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'DELETE',
      headers: createBackendHeaders(request),
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const body = safeJsonParse(text, {});
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { error: 'Jira OAuth disconnect unavailable' },
      { status: 502 }
    );
  }
}
