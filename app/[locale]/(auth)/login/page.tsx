'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth/authService';
import { toast } from 'sonner';
import { useState } from 'react';
import { ApiRequestError } from '@/lib/api/client';
import { AuthPageShell } from '@/components/auth/AuthPageShell';

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(6),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('landing.login');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      await authService.login(data);
      toast.success('Logged in successfully');
      router.push(`/${locale}/scans`);
    } catch (error: any) {
      if (error instanceof ApiRequestError && error.data.details) {
        Object.entries(error.data.details).forEach(([field, messages]) => {
          setError(field as any, { message: messages[0] });
        });
      }
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      title={t('title')}
      subtitle={t('subtitle')}
      footerPrefix={t('noAccount')}
      footerLinkLabel={t('register')}
      footerHref={`/${locale}/register`}
      formChildren={
        <div>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  {t('email')}
                </label>
                <input
                  {...register('email')}
                  type="text"
                  data-testid="login-email"
                  className="appearance-none relative block w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-status-danger">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  {t('password')}
                </label>
                <input
                  {...register('password')}
                  type="password"
                  data-testid="login-password"
                  className="appearance-none relative block w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-status-danger">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit"
                className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:shadow-[0_0_30px_rgba(0,209,255,0.26)] focus:outline-none focus:ring-2 focus:ring-cyan-300/50 focus:ring-offset-2 focus:ring-offset-cyber-bg disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950/80 border-t-transparent"></div>
                ) : (
                  t('submit')
                )}
              </button>
            </div>
          </form>
        </div>
      }
    />
  );
}

