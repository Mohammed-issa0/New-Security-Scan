'use client';

interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number; // timestamp in ms
  refreshTokenExpiresAt: number; // timestamp in ms
}

class TokenStore {
  private tokens: Tokens | null = null;
  private listeners: ((tokens: Tokens | null) => void)[] = [];

  private syncAuthCookies(tokens: Tokens | null) {
    if (typeof document === 'undefined') {
      return;
    }

    if (!tokens?.accessToken) {
      document.cookie = 'auth_access_token=; Path=/; Max-Age=0; SameSite=Lax';
      return;
    }

    const maxAgeSeconds = Math.max(0, Math.floor((tokens.accessTokenExpiresAt - Date.now()) / 1000));
    document.cookie = `auth_access_token=${encodeURIComponent(tokens.accessToken)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auth_tokens');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Tokens;
          if (!parsed?.accessToken || !parsed?.refreshToken) {
            throw new Error('Invalid tokens shape');
          }
          if (Date.now() >= parsed.refreshTokenExpiresAt) {
            throw new Error('Refresh token expired');
          }
          this.tokens = parsed;
        } catch (e) {
          localStorage.removeItem('auth_tokens');
        }
      }
    }
  }

  getTokens(): Tokens | null {
    return this.tokens;
  }

  setTokens(tokens: Tokens | null) {
    this.tokens = tokens;
    if (typeof window !== 'undefined') {
      if (tokens) {
        localStorage.setItem('auth_tokens', JSON.stringify(tokens));
      } else {
        localStorage.removeItem('auth_tokens');
      }
      this.syncAuthCookies(tokens);
    }
    this.notify();
  }

  subscribe(listener: (tokens: Tokens | null) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.tokens));
  }

  clear() {
    this.setTokens(null);
  }

  isAccessTokenExpired(): boolean {
    if (!this.tokens) return true;
    // Proactive refresh: 60 seconds before expiry
    return Date.now() >= this.tokens.accessTokenExpiresAt - 60000;
  }

  isRefreshTokenExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.refreshTokenExpiresAt;
  }
}

export const tokenStore = new TokenStore();

