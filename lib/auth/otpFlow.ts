import type { LoginRequest, RegisterRequest } from '@/lib/api/types';
import type { OtpChallengeResponse } from './authService';

const OTP_FLOW_STORAGE_KEY = 'auth:otp:flow';

export type OtpFlowMode = 'login' | 'register';

export interface OtpFlowState {
  mode: OtpFlowMode;
  challenge: OtpChallengeResponse;
  createdAt: number;
  loginData?: LoginRequest;
  registerData?: RegisterRequest;
}

const hasWindow = () => typeof window !== 'undefined';

export const setOtpFlowState = (state: OtpFlowState) => {
  if (!hasWindow()) return;
  window.sessionStorage.setItem(OTP_FLOW_STORAGE_KEY, JSON.stringify(state));
};

export const getOtpFlowState = (): OtpFlowState | null => {
  if (!hasWindow()) return null;

  const raw = window.sessionStorage.getItem(OTP_FLOW_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OtpFlowState;
  } catch {
    return null;
  }
};

export const clearOtpFlowState = () => {
  if (!hasWindow()) return;
  window.sessionStorage.removeItem(OTP_FLOW_STORAGE_KEY);
};
