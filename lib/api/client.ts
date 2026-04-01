import { tokenStore } from '../auth/tokenStore';
import { clearSensitiveBrowserData, notifySessionEnded, redirectToLogin } from '../auth/session';

const API_PREFIX = '/api/v1';

export interface ApiError {
  error?: string;
  message?: string;
  detail?: string;
  details?: Record<string, string[]>;
}

export class ApiRequestError extends Error {
  constructor(public status: number, public data: ApiError) {
    super(data.error || data.message || data.detail || 'API Request Failed');
  }
}

let refreshInFlight: Promise<string> | null = null;

function endExpiredSession() {
  tokenStore.clear();
  clearSensitiveBrowserData();
  notifySessionEnded('refresh_failed');
  redirectToLogin('refresh_failed');
}

async function refreshTokens() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const tokens = tokenStore.getTokens();
    if (!tokens) throw new Error('No refresh token available');
    if (tokenStore.isRefreshTokenExpired()) {
      throw new Error('Refresh token expired');
    }

    const response = await fetch(`${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Session expired');
    }

    const newTokens = await response.json();
    tokenStore.setTokens({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      accessTokenExpiresAt: new Date(newTokens.accessTokenExpiresAt).getTime(),
      refreshTokenExpiresAt: new Date(newTokens.refreshTokenExpiresAt).getTime(),
    });

    return newTokens.accessToken;
  })()
    .catch((error) => {
      endExpiredSession();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function apiFetch(endpoint: string, options: RequestInit = {}, responseType: 'json' | 'blob' = 'json') {
  let tokens = tokenStore.getTokens();

  // Proactive refresh
  if (tokens && tokenStore.isAccessTokenExpired()) {
    try {
      await refreshTokens();
      tokens = tokenStore.getTokens();
    } catch (e) {
      // Failed to refresh proactively, let the request fail or handle 401
    }
  }

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  const url = `${API_PREFIX}${endpoint}`;
  let response = await fetch(url, { ...options, headers });

  // Handle 401 and retry refresh
  if (response.status === 401 && tokens) {
    try {
      const newAccessToken = await refreshTokens();
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      response = await fetch(url, { ...options, headers });
    } catch (e) {
      // refreshTokens already handles clearing and redirecting
      throw e;
    }
  }

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: response.statusText || `HTTP ${response.status}` }));
    if (response.status === 401 && tokens) {
      endExpiredSession();
    }
    throw new ApiRequestError(response.status, errorData);
  }

  if (response.status === 204 || response.status === 202) {
    return null;
  }

  if (responseType === 'blob') {
    return response.blob();
  }

  return response.json().catch(() => null);
}

export const client = {
  get: (endpoint: string, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'GET' }),
  getBlob: (endpoint: string, options?: RequestInit) =>
    apiFetch(endpoint, { ...options, method: 'GET' }, 'blob') as Promise<Blob>,
  post: (endpoint: string, body?: any, options?: RequestInit) => 
    apiFetch(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body?: any, options?: RequestInit) => 
    apiFetch(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'DELETE' }),
};

