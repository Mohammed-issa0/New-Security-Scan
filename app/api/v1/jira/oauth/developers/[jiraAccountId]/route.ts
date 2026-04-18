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

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL(
    `/api/v1/jira/oauth/developers/${encodeURIComponent(jiraAccountId)}`,
    backendBase
  );
  backendUrl.searchParams.set('softDelete', softDelete);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: request.headers.get('authorization') || '',
        Accept: 'application/json',
      },
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
