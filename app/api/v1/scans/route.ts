import { NextRequest, NextResponse } from 'next/server';

import { enforceConcurrentScanLimit, proxyBackendRequest } from '../_scan-concurrency';

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, '/api/v1/scans');
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  const limitCheck = await enforceConcurrentScanLimit(request);
  if (!limitCheck.allowed) {
    return limitCheck.response;
  }

  return proxyBackendRequest(request, '/api/v1/scans', body);
}