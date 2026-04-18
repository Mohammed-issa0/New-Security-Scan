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

export default function RegisterPage() {
  const t = useTranslations('landing.register');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const registerSchema = z.object({
    fullName: z.string().trim().optional().or(z.literal('')),
    firstName: z.string().trim().optional().or(z.literal('')),
    lastName: z.string().trim().optional().or(z.literal('')),
    email: z.string().email(),
    password: z
      .string()
      .min(8, t('passwordRules.minLength'))
      .regex(/[A-Z]/, t('passwordRules.uppercase'))
      .regex(/[a-z]/, t('passwordRules.lowercase'))
      .regex(/[^a-zA-Z0-9]/, t('passwordRules.special')),
    confirmPassword: z.string().min(8),
  }).superRefine((data, ctx) => {
    const fullName = data.fullName?.trim();
    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    const hasSplitName = !!firstName || !!lastName;

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('confirmPasswordMismatch'), path: ['confirmPassword'] });
    }

    if (!fullName && !hasSplitName) {
      const message = t('nameRequired');
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['fullName'] });
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['firstName'] });
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['lastName'] });
      return;
    }

    if (!fullName && (!!firstName !== !!lastName)) {
      const message = t('splitNameRequired');
      if (!firstName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['firstName'] });
      }
      if (!lastName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['lastName'] });
      }
    }

    if (fullName && fullName.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('nameTooShort'), path: ['fullName'] });
    }
  });

  type RegisterFormValues = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      const fullName = data.fullName?.trim();
      const firstName = data.firstName?.trim();
      const lastName = data.lastName?.trim();

      await authService.register({
        fullName: fullName || undefined,
        firstName: fullName ? undefined : firstName || undefined,
        lastName: fullName ? undefined : lastName || undefined,
        email: data.email,
        password: data.password,
      });
      toast.success('Account created successfully');
      router.push(`/${locale}/scans`);
    } catch (error: any) {
      if (error instanceof ApiRequestError && error.data.details) {
        Object.entries(error.data.details).forEach(([field, messages]) => {
          setError(field as any, { message: messages[0] });
        });
      }
      toast.error(error.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      title={t('title')}
      subtitle={t('subtitle')}
      footerPrefix={t('hasAccount')}
      footerLinkLabel={t('login')}
      footerHref={`/${locale}/login`}
      formChildren={
        <div>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  {t('fullName')}
                </label>
                <input
                  {...register('fullName')}
                  type="text"
                  className="appearance-none relative block w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-status-danger">{errors.fullName.message}</p>
                )}
                <p className="mt-1 text-xs text-text-muted">{t('fullNameHint')}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">
                    {t('firstName')}
                  </label>
                  <input
                    {...register('firstName')}
                    type="text"
                    className="appearance-none relative block w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-status-danger">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-text-secondary">
                    {t('lastName')}
                  </label>
                  <input
                    {...register('lastName')}
                    type="text"
                    className="appearance-none relative block w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-status-danger">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  {t('email')}
                </label>
                <input
                  {...register('email')}
                  type="email"
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
                  className="appearance-none relative block w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-status-danger">{errors.password.message}</p>
                )}
                <p className="mt-1 text-xs text-text-muted">{t('passwordRules.hint')}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  {t('confirmPassword')}
                </label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  className="appearance-none relative block w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-status-danger">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
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

