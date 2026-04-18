import { NextRequest } from 'next/server';
import { proxyInternalScanRequest } from '../../_internal';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scanId: string }> }
) {
  return proxyInternalScanRequest(request, context, '/internal/scans/{scanId}/trend');
}