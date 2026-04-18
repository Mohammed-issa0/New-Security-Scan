import { NextRequest, NextResponse } from 'next/server';

import type { ActivePlanResponse, PlanPublicResponse } from '@/lib/plans/types';

const DEFAULT_BACKEND_BASE = 'https://backend.blackbrains.tech';
const ACTIVE_SCAN_STATUSES = new Set(['pending', 'running']);

function getBackendBase() {
  return process.env.API_BASE_URL || DEFAULT_BACKEND_BASE;
}

function getAuthorizationHeader(request: NextRequest) {
  return request.headers.get('authorization') || '';
}

function createBackendHeaders(request: NextRequest, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = {
    Authorization: getAuthorizationHeader(request),
    Accept: request.headers.get('accept') || 'application/json',
  };

  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers[key] = value;
    }
  }

  return headers;
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function fetchActivePlan(request: NextRequest): Promise<ActivePlanResponse | null> {
  const backendUrl = new URL('/api/v1/plans/me', getBackendBase());
  const response = await fetch(backendUrl.toString(), {
    method: 'GET',
    headers: createBackendHeaders(request),
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return readJsonResponse<ActivePlanResponse>(response);
}

async function fetchPublicPlans(request: NextRequest): Promise<PlanPublicResponse[] | null> {
  const backendUrl = new URL('/api/v1/plans', getBackendBase());
  const response = await fetch(backendUrl.toString(), {
    method: 'GET',
    headers: createBackendHeaders(request),
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return readJsonResponse<PlanPublicResponse[]>(response);
}

function getPlanMaxConcurrentScans(plan?: PlanPublicResponse | null) {
  const rawValue = plan?.maxConcurrentScans ?? plan?.max_concurrent_scans ?? 0;
  const parsed = Number(rawValue);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

async function countActiveScans(request: NextRequest) {
  const backendUrl = new URL('/api/v1/scans', getBackendBase());
  const pageSize = 200;
  let pageNumber = 1;
  let totalActive = 0;

  while (true) {
    backendUrl.searchParams.set('pageNumber', String(pageNumber));
    backendUrl.searchParams.set('pageSize', String(pageSize));

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: createBackendHeaders(request),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Unable to read active scans');
    }

    const payload = await readJsonResponse<{ items?: Array<{ status?: string | number }> } & { totalCount?: number }>(response);
    const items = Array.isArray(payload?.items) ? payload.items : [];

    totalActive += items.filter((item) => {
      const status = String(item?.status ?? '').trim().toLowerCase();
      return ACTIVE_SCAN_STATUSES.has(status);
    }).length;

    if (items.length < pageSize) {
      break;
    }

    pageNumber += 1;
  }

  return totalActive;
}

export async function enforceConcurrentScanLimit(request: NextRequest) {
  const [activePlan, publicPlans] = await Promise.all([
    fetchActivePlan(request),
    fetchPublicPlans(request),
  ]);

  const planName = activePlan?.planName?.trim().toLowerCase();
  if (!planName) {
    return { allowed: true as const };
  }

  if (!publicPlans?.length) {
    return {
      allowed: false as const,
      response: NextResponse.json(
        { error: 'Unable to determine the current plan concurrency limit.' },
        { status: 503 }
      ),
    };
  }

  const matchedPlan = publicPlans.find((plan) => plan.planName?.trim().toLowerCase() === planName) ?? null;
  if (!matchedPlan) {
    return {
      allowed: false as const,
      response: NextResponse.json(
        { error: 'Unable to resolve the current plan concurrency limit.' },
        { status: 503 }
      ),
    };
  }

  const maxConcurrentScans = getPlanMaxConcurrentScans(matchedPlan);

  if (maxConcurrentScans <= 0) {
    return { allowed: true as const };
  }

  let activeCount: number;
  try {
    activeCount = await countActiveScans(request);
  } catch {
    return {
      allowed: false as const,
      response: NextResponse.json(
        { error: 'Unable to verify active scan count right now.' },
        { status: 503 }
      ),
    };
  }

  if (activeCount >= maxConcurrentScans) {
    return {
      allowed: false as const,
      response: NextResponse.json(
        {
          error: `Concurrent scan limit reached. Your plan allows up to ${maxConcurrentScans} active scans and you currently have ${activeCount}.`,
        },
        { status: 400 }
      ),
    };
  }

  return { allowed: true as const };
}

export async function proxyBackendRequest(request: NextRequest, backendPath: string, body?: string) {
  const backendUrl = new URL(backendPath, getBackendBase());
  backendUrl.search = new URL(request.url).search;

  const headers = createBackendHeaders(request);

  if (body !== undefined) {
    headers['Content-Type'] = request.headers.get('content-type') || 'application/json';
  }

  const response = await fetch(backendUrl.toString(), {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}