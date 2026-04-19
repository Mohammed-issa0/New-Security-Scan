import { NextRequest, NextResponse } from 'next/server';
import { forwardJsonToBackend } from '@/app/api/v1/_backend-proxy';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return forwardJsonToBackend({
    request,
    backendPath: '/api/v1/plans',
    method: 'GET',
    fallback: [],
    unavailableMessage: 'Plans unavailable',
  });
}