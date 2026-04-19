import { NextRequest, NextResponse } from 'next/server';
import { forwardJsonToBackend } from '../../_backend-proxy';

export const runtime = 'nodejs';

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

  const backendBody = {
    fullName,
    firstName: payload.fullName?.trim() ? undefined : payload.firstName?.trim() || undefined,
    lastName: payload.fullName?.trim() ? undefined : payload.lastName?.trim() || undefined,
    email,
    password,
  };

  return forwardJsonToBackend({
    request,
    backendPath: '/api/v1/auth/register',
    method: 'POST',
    body: JSON.stringify(backendBody),
    fallback: {},
    unavailableMessage: 'Registration unavailable',
  });
}