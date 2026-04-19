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

type RegisterPayload = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  password?: string | null;
};

function deriveFullName(payload: RegisterPayload) {
  const explicitFullName = payload.fullName?.trim();
  if (explicitFullName) {
    return explicitFullName;
  }

  const firstName = payload.firstName?.trim();
  const lastName = payload.lastName?.trim();
  const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return combinedName || null;
}

function buildError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as RegisterPayload | null;

  if (!payload) {
    return buildError('Invalid register payload');
  }

  const email = payload.email?.trim();
  const password = payload.password?.trim();
  const fullName = deriveFullName(payload);

  if (!email) {
    return buildError('email is required');
  }

  if (!password) {
    return buildError('password is required');
  }

  if (!fullName) {
    return buildError('fullName or firstName and lastName are required');
  }

  const backendBase = process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
  const backendUrl = new URL('/api/v1/auth/register', backendBase);

  const backendBody = {
    fullName,
    firstName: payload.fullName?.trim() ? undefined : payload.firstName?.trim() || undefined,
    lastName: payload.fullName?.trim() ? undefined : payload.lastName?.trim() || undefined,
    email,
    password,
  };

  try {
    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: request.headers.get('authorization') || '',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendBody),
      cache: 'no-store',
    });

    const text = await backendResponse.text();
    const body = safeJsonParse(text, text ? { error: text } : {});
    return NextResponse.json(body, { status: backendResponse.status });
  } catch {
    return buildError('Registration unavailable', 502);
  }
}