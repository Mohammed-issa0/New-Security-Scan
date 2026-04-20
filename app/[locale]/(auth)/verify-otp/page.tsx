'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { authService } from '@/lib/auth/authService';
import { ApiRequestError } from '@/lib/api/client';
import {
  clearOtpFlowState,
  getOtpFlowState,
  setOtpFlowState,
  type OtpFlowState,
} from '@/lib/auth/otpFlow';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyOtpPage() {
  const t = useTranslations('landing.login');
  const locale = useLocale();
  const router = useRouter();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [flowState, setFlowState] = useState<OtpFlowState | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const labels = useMemo(() => {
    const isAr = locale === 'ar';
    return {
      title: isAr ? 'التحقق من الرمز' : 'Verify OTP Code',
      subtitle: isAr
        ? 'أدخل رمز التحقق المكوّن من 6 أرقام المرسل إلى بريدك لإكمال تسجيل الدخول.'
        : 'Enter the 6-digit code sent to your email to complete authentication.',
      codeLabel: isAr ? 'رمز التحقق' : 'Verification code',
      verifyButton: isAr ? 'تأكيد الرمز' : 'Verify code',
      resendButton: isAr ? 'إعادة إرسال الرمز' : 'Resend code',
      resendWait: isAr ? 'يمكنك إعادة الإرسال بعد' : 'You can resend in',
      expiresIn: isAr ? 'ينتهي الرمز خلال' : 'Code expires in',
      expired: isAr ? 'انتهت صلاحية الرمز. أعد الإرسال للحصول على رمز جديد.' : 'Code expired. Resend to get a new code.',
      backToLogin: isAr ? 'العودة لتسجيل الدخول' : 'Back to login',
      missingFlow: isAr ? 'لا توجد جلسة تحقق نشطة. أعد تسجيل الدخول.' : 'No active OTP session found. Please sign in again.',
      invalidCode: isAr ? 'رمز التحقق يجب أن يكون 6 أرقام' : 'OTP must be 6 digits',
      sentTo: isAr ? 'تم الإرسال إلى' : 'Sent to',
      success: isAr ? 'تم التحقق بنجاح' : 'Verification successful',
      verifyFailed: isAr ? 'فشل التحقق من الرمز' : 'Failed to verify code',
      resendSuccess: isAr ? 'تم إرسال رمز جديد' : 'A new code was sent',
      resendFailed: isAr ? 'تعذر إعادة إرسال الرمز' : 'Failed to resend code',
    };
  }, [locale]);

  useEffect(() => {
    const stored = getOtpFlowState();
    if (!stored) {
      toast.error(labels.missingFlow);
      router.replace(`/${locale}/login`);
      return;
    }

    setFlowState(stored);
    const expiresAtMs = new Date(stored.challenge.expiresAt).getTime();
    const left = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
    setSecondsLeft(left);
  }, [labels.missingFlow, locale, router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const otpValue = otpDigits.join('');
  const isExpired = secondsLeft === 0;

  const formatTime = (totalSeconds: number) => {
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, i) => {
      next[i] = char;
    });

    setOtpDigits(next);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async () => {
    if (!flowState?.challenge?.otpToken) return;

    if (!/^\d{6}$/.test(otpValue)) {
      toast.error(labels.invalidCode);
      return;
    }

    if (isExpired) {
      toast.error(labels.expired);
      return;
    }

    setSubmitting(true);
    try {
      await authService.verifyOtp({
        otpToken: flowState.challenge.otpToken,
        code: otpValue,
      });
      clearOtpFlowState();
      toast.success(labels.success);
      router.replace(`/${locale}`);
    } catch (error: any) {
      if (error instanceof ApiRequestError && error.data?.detail) {
        toast.error(error.data.detail);
      } else {
        toast.error(error?.message || labels.verifyFailed);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!flowState || resendCooldown > 0 || resending) return;

    setResending(true);
    try {
      const nextChallenge =
        flowState.mode === 'login'
          ? await authService.login(flowState.loginData!)
          : await authService.register(flowState.registerData!);

      const nextState: OtpFlowState = {
        ...flowState,
        challenge: nextChallenge,
        createdAt: Date.now(),
      };

      setOtpFlowState(nextState);
      setFlowState(nextState);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      const expiresAtMs = new Date(nextChallenge.expiresAt).getTime();
      setSecondsLeft(Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)));
      inputRefs.current[0]?.focus();
      toast.success(labels.resendSuccess);
    } catch (error: any) {
      toast.error(error?.message || labels.resendFailed);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthPageShell
      title={labels.title}
      subtitle={labels.subtitle}
      footerPrefix={flowState?.mode === 'register' ? (locale === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?') : (locale === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?")}
      footerLinkLabel={flowState?.mode === 'register' ? (locale === 'ar' ? 'سجل الدخول' : 'Sign in') : (locale === 'ar' ? 'إنشاء حساب' : 'Create account')}
      footerHref={flowState?.mode === 'register' ? `/${locale}/login` : `/${locale}/register`}
      formChildren={
        <div className="space-y-6">
          <div className="rounded-xl border border-cyan-300/20 bg-white/5 p-4 text-sm text-text-secondary">
            <p>
              {labels.sentTo}:{' '}
              <span className="font-semibold text-cyan-200">{flowState?.challenge.maskedEmail ?? '-'}</span>
            </p>
            <p className="mt-2">
              {isExpired ? (
                <span className="font-medium text-status-danger">{labels.expired}</span>
              ) : (
                <span>
                  {labels.expiresIn}:{' '}
                  <span className="font-semibold text-cyan-200">{formatTime(secondsLeft)}</span>
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-text-secondary">{labels.codeLabel}</label>
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  className="h-12 rounded-lg border border-cyan-400/20 bg-white/5 text-center text-lg font-semibold text-text-primary outline-none transition focus:border-cyan-300/80 focus:ring-2 focus:ring-cyan-300/40"
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleVerify}
              disabled={submitting || resending || isExpired}
              className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:shadow-[0_0_30px_rgba(0,209,255,0.26)] focus:outline-none focus:ring-2 focus:ring-cyan-300/50 focus:ring-offset-2 focus:ring-offset-cyber-bg disabled:opacity-50"
            >
              {submitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950/80 border-t-transparent"></div>
              ) : (
                labels.verifyButton
              )}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending || submitting || resendCooldown > 0}
              className="group relative flex w-full justify-center rounded-lg border border-cyan-300/40 bg-white/5 px-4 py-2 text-sm font-semibold text-cyan-100 transition-all hover:bg-cyan-400/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 focus:ring-offset-2 focus:ring-offset-cyber-bg disabled:opacity-50"
            >
              {resending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-100/80 border-t-transparent"></div>
              ) : resendCooldown > 0 ? (
                `${labels.resendWait} ${formatTime(resendCooldown)}`
              ) : (
                labels.resendButton
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                clearOtpFlowState();
                router.replace(`/${locale}/login`);
              }}
              className="text-sm font-medium text-text-secondary transition hover:text-cyan-200"
            >
              {labels.backToLogin}
            </button>
          </div>
        </div>
      }
    />
  );
}
