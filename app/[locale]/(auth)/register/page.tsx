'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth/authService';
import { toast } from 'sonner';
import { useState } from 'react';
import Link from 'next/link';
import { ApiRequestError } from '@/lib/api/client';

export default function RegisterPage() {
  const t = useTranslations('landing.register');
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const registerSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z
      .string()
      .min(8, t('passwordRules.minLength'))
      .regex(/[A-Z]/, t('passwordRules.uppercase'))
      .regex(/[a-z]/, t('passwordRules.lowercase'))
      .regex(/[^a-zA-Z0-9]/, t('passwordRules.special')),
    confirmPassword: z.string().min(8),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('confirmPasswordMismatch'),
    path: ['confirmPassword'],
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
      await authService.register({
        fullName: data.fullName,
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('subtitle')}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('fullName')}
              </label>
              <input
                {...register('fullName')}
                type="text"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('email')}
              </label>
              <input
                {...register('email')}
                type="email"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('password')}
              </label>
              <input
                {...register('password')}
                type="password"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">{t('passwordRules.hint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('confirmPassword')}
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                t('submit')
              )}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">{t('hasAccount')}</span>{' '}
            <Link
              href={`/${locale}/login`}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {t('login')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

