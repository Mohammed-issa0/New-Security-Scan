import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_BASE = 'https://backend.blackbrains.tech';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export function getBackendBase() {
  return process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
}

export function safeJsonParse(text: string, fallback: unknown) {
  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function createBackendHeaders(
  request: NextRequest,
  includeBodyHeaders = false,
  extraHeaders?: Record<string, string>
) {
  const headers: Record<string, string> = {
    Authorization: request.headers.get('authorization') || '',
    Accept: request.headers.get('accept') || 'application/json',
  };

  if (includeBodyHeaders) {
    headers['Content-Type'] = request.headers.get('content-type') || 'application/json';
  }

  const internalToken = request.headers.get('x-internal-service-token');
  if (internalToken) {
    headers['X-Internal-Service-Token'] = internalToken;
  }

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value;
    }
  }

  return headers;
}

export async function forwardJsonToBackend(options: {
  request: NextRequest;
  backendPath: string;
  method: string;
  body?: string;
  fallback: unknown;
  unavailableMessage: string;
}) {
  const { request, backendPath, method, body, fallback, unavailableMessage } = options;
  const backendUrl = new URL(backendPath, getBackendBase());

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method,
      headers: createBackendHeaders(request, body !== undefined),
      body,
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const responseBody = safeJsonParse(text, fallback);
    return NextResponse.json(responseBody, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ error: unavailableMessage }, { status: 502 });
  }
}

export async function proxyToBackend(options: {
  request: NextRequest;
  backendPath: string;
  method: string;
  body?: string;
  unavailableMessage: string;
}) {
  const { request, backendPath, method, body, unavailableMessage } = options;
  const backendUrl = new URL(backendPath, getBackendBase());
  backendUrl.search = new URL(request.url).search;

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method,
      headers: createBackendHeaders(request, body !== undefined),
      body,
      cache: 'no-store',
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: backendResponse.headers,
    });
  } catch {
    return NextResponse.json({ error: unavailableMessage }, { status: 502 });
  }
}