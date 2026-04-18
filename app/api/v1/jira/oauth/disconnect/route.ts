import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_BASE = 'https://backend.blackbrains.tech';

export async function DELETE(request: NextRequest) {
  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL('/api/v1/jira/oauth/disconnect', backendBase);

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const body = text ? JSON.parse(text) : {};
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { error: 'Jira OAuth disconnect unavailable' },
      { status: 502 }
    );
  }
}
