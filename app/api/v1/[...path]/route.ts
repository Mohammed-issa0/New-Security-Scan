import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/app/api/v1/_backend-proxy';

export const runtime = 'nodejs';
// Guided-setup calls run 5-13s and the final recommendation has been measured at
// 35s, so the proxy hop must outlive the platform's short serverless default.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return proxyToBackend({
    request,
    backendPath: new URL(request.url).pathname,
    method: 'GET',
    unavailableMessage: 'Backend service unavailable',
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend({
    request,
    backendPath: new URL(request.url).pathname,
    method: 'POST',
    body,
    unavailableMessage: 'Backend service unavailable',
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend({
    request,
    backendPath: new URL(request.url).pathname,
    method: 'PUT',
    body,
    unavailableMessage: 'Backend service unavailable',
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend({
    request,
    backendPath: new URL(request.url).pathname,
    method: 'PATCH',
    body,
    unavailableMessage: 'Backend service unavailable',
  });
}

export async function DELETE(request: NextRequest) {
  const body = await request.text().catch(() => '');
  return proxyToBackend({
    request,
    backendPath: new URL(request.url).pathname,
    method: 'DELETE',
    body: body || undefined,
    unavailableMessage: 'Backend service unavailable',
  });
}