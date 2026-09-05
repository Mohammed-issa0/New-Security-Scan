import { NextRequest, NextResponse } from 'next/server';
import { createBackendHeaders, getBackendBase, safeJsonParse } from '@/app/api/v1/_backend-proxy';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ jiraAccountId: string }> }
) {
  const { jiraAccountId } = await context.params;

  if (!jiraAccountId) {
    return NextResponse.json({ error: 'jiraAccountId is required' }, { status: 400 });
  }

  const incomingUrl = new URL(request.url);
  const softDelete = incomingUrl.searchParams.get('softDelete') ?? 'true';

  const backendUrl = new URL(
    `/api/v1/jira/oauth/developers/${encodeURIComponent(jiraAccountId)}`,
    getBackendBase()
  );
  backendUrl.searchParams.set('softDelete', softDelete);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'DELETE',
      headers: createBackendHeaders(request),
      cache: 'no-store',
    });

    if (backendResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const text = await backendResponse.text();
    const body = safeJsonParse(text, {});
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: 'Jira OAuth developer unlink unavailable' }, { status: 502 });
  }
}
