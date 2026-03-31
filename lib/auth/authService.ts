import { endpoints } from '../api/endpoints';
import { tokenStore } from './tokenStore';
import { clearSensitiveBrowserData, notifySessionEnded, redirectToLogin } from './session';

interface AuthResponse {
  userId: string;
  fullName?: string | null;
  email?: string | null;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

const assertAuthResponse = (response: AuthResponse) => {
  if (!response?.accessToken || !response?.refreshToken) {
    throw new Error('Auth response is missing tokens');
  }
  if (!response?.accessTokenExpiresAt || !response?.refreshTokenExpiresAt) {
    throw new Error('Auth response is missing token expiry');
  }
};

export const authService = {
  async login(data: any) {
    const response = await endpoints.auth.login(data) as AuthResponse;
    assertAuthResponse(response);
    tokenStore.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      accessTokenExpiresAt: new Date(response.accessTokenExpiresAt).getTime(),
      refreshTokenExpiresAt: new Date(response.refreshTokenExpiresAt).getTime(),
    });
    return {
      id: response.userId,
      fullName: response.fullName ?? null,
      email: response.email ?? null,
    };
  },

  async register(data: any) {
    const response = await endpoints.auth.register(data) as AuthResponse;
    assertAuthResponse(response);
    tokenStore.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      accessTokenExpiresAt: new Date(response.accessTokenExpiresAt).getTime(),
      refreshTokenExpiresAt: new Date(response.refreshTokenExpiresAt).getTime(),
    });
    return {
      id: response.userId,
      fullName: response.fullName ?? null,
      email: response.email ?? null,
    };
  },

  logout() {
    tokenStore.clear();
    clearSensitiveBrowserData();
    notifySessionEnded('logout');
    redirectToLogin('logout');
  },

  async getMe() {
    return endpoints.users.me();
  },

  isAuthenticated() {
    return !!tokenStore.getTokens()?.accessToken;
  }
};

