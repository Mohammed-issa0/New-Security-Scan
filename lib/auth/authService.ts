import { endpoints } from '../api/endpoints';
import type { LoginRequest, RegisterRequest } from '../api/types';
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

export interface OtpChallengeResponse {
  requiresOtp: boolean;
  otpToken: string;
  maskedEmail?: string | null;
  expiresAt: string;
}

export interface VerifyOtpRequest {
  otpToken: string;
  code: string;
}

const assertAuthResponse = (response: AuthResponse) => {
  if (!response?.accessToken || !response?.refreshToken) {
    throw new Error('Auth response is missing tokens');
  }
  if (!response?.accessTokenExpiresAt || !response?.refreshTokenExpiresAt) {
    throw new Error('Auth response is missing token expiry');
  }
};

const assertOtpChallengeResponse = (response: OtpChallengeResponse) => {
  if (!response?.requiresOtp || !response?.otpToken) {
    throw new Error('Auth response is missing OTP challenge data');
  }
  if (!response?.expiresAt) {
    throw new Error('Auth response is missing OTP expiry');
  }
};

const completeAuthSession = (response: AuthResponse) => {
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
};

export const authService = {
  async login(data: LoginRequest) {
    const response = await endpoints.auth.login(data) as OtpChallengeResponse;
    assertOtpChallengeResponse(response);
    return response;
  },

  async register(data: RegisterRequest) {
    const response = await endpoints.auth.register(data) as OtpChallengeResponse;
    assertOtpChallengeResponse(response);
    return response;
  },

  async verifyOtp(data: VerifyOtpRequest) {
    const response = await endpoints.auth.verifyOtp(data) as AuthResponse;
    return completeAuthSession(response);
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

