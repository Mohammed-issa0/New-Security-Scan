'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CreditCard, Gauge, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { ApiRequestError } from '@/lib/api/client';
import { plansService } from '@/lib/plans/plansService';
import type { CheckoutSessionResponse, PurchaseExtraScanResponse } from '@/lib/plans/types';
import { findMatchingPlanDefinition, getCreditsUsagePercent, getPlanDisplayName, getPlanTools } from '@/lib/plans/utils';
import { Alert, Badge, Button } from '@/components/scans/ui';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    const payload = error.data as unknown as Record<string, unknown> | undefined;
    const detail = payload?.detail;
    const title = payload?.title;
    const message = payload?.message;
    const apiError = payload?.error;

    return String(message || detail || title || apiError || error.message || fallback);
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export function CurrentPlanPageContent() {
  const t = useTranslations('billingPage');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const billingMode = process.env.NEXT_PUBLIC_BILLING_MODE || 'stripe';
  const status = searchParams.get('status');
  const hasToastedStatus = React.useRef(false);

  const { data: plansData } = useQuery({
    queryKey: ['plans-public'],
    queryFn: () => plansService.listPublic(),
  });

  const {
    data: activePlan,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['plans-active'],
    queryFn: async () => {
      try {
        return await plansService.getActivePlan();
      } catch (queryError) {
        if (queryError instanceof ApiRequestError && queryError.status === 404) {
          return null;
        }
        throw queryError;
      }
    },
  });

  const matchingPlan = findMatchingPlanDefinition(activePlan, plansData);
  const tools = getPlanTools(matchingPlan || activePlan);
  const usagePercent = getCreditsUsagePercent(activePlan);
  const extraRules = matchingPlan?.extraCredit;

  const extraCreditMutation = useMutation<CheckoutSessionResponse | PurchaseExtraScanResponse, unknown, void>({
    mutationFn: () =>
      billingMode === 'direct' ? plansService.purchaseExtraScanDirect() : plansService.checkoutExtraCredit(),
    onSuccess: async (response) => {
      if (billingMode === 'direct') {
        await queryClient.invalidateQueries({ queryKey: ['plans-active'] });
        toast.success(t('actions.extraPurchaseSuccess'));
        return;
      }

      if ('url' in response && response?.url) {
        window.location.href = response.url;
        return;
      }

      toast.error(t('actions.checkoutMissing'));
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, t('actions.extraPurchaseError')));
    },
  });

  React.useEffect(() => {
    if (status !== 'success') {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['plans-active'] });
  }, [queryClient, status]);

  React.useEffect(() => {
    if (!status || hasToastedStatus.current) {
      return;
    }

    if (status === 'success') {
      toast.success(t('status.success.toast'));
      hasToastedStatus.current = true;
      return;
    }

    if (status === 'failed' || status === 'cancel') {
      toast.error(t(`status.${status}.toast`));
      hasToastedStatus.current = true;
    }
  }, [status, t]);

  const formatNumber = (value?: number | null) => new Intl.NumberFormat(locale).format(value ?? 0);
  const formatDate = (value?: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value))
      : t('labels.notAvailable');
  const formatPercent = (value: number) => `${value}%`;
  const formatPrice = (priceCents?: number | null, currency?: string | null) => {
    if (!priceCents) {
      return t('labels.free');
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
      minimumFractionDigits: 0,
    }).format(priceCents / 100);
  };

  return (
    <div className="space-y-8 px-4 sm:px-0">
      <section className="relative overflow-hidden rounded-3xl border border-blue-100/70 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-8 shadow-sm">
        <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-24 left-0 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="bg-white/80">
              <Sparkles size={14} className="mr-2" />
              {t('hero.badge')}
            </Badge>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">{t('hero.eyebrow')}</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 md:text-4xl">{t('hero.title')}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">{t('hero.subtitle')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/${locale}/plans`}>
              <Button variant="outline">{t('actions.comparePlans')}</Button>
            </Link>
            <Link href={`/${locale}/scans/new`}>
              <Button>{t('actions.startScan')}</Button>
            </Link>
          </div>
        </div>
      </section>

      {status && (
        <Alert variant={status === 'success' ? 'success' : 'warning'} title={t(`status.${status}.title`)}>
          {t(`status.${status}.description`)}
        </Alert>
      )}

      {isLoading && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        </div>
      )}

      {!isLoading && isError && (
        <Alert variant="error" title={t('states.error.title')}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{getErrorMessage(error, t('states.error.description'))}</span>
            <Button size="sm" onClick={() => refetch()}>
              {t('actions.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {!isLoading && !isError && !activePlan && (
        <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="max-w-2xl space-y-4">
            <Badge variant="warning">{t('states.empty.badge')}</Badge>
            <h2 className="text-2xl font-bold text-gray-900">{t('states.empty.title')}</h2>
            <p className="text-sm leading-7 text-gray-600">{t('states.empty.description')}</p>
            <Link href={`/${locale}/plans`}>
              <Button>{t('actions.choosePlan')}</Button>
            </Link>
          </div>
        </section>
      )}

      {!isLoading && !isError && activePlan && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                <span>{t('summary.currentPlan')}</span>
                <CreditCard size={16} className="text-blue-600" />
              </div>
              <div className="mt-4 text-2xl font-bold text-gray-900">{getPlanDisplayName(matchingPlan || activePlan)}</div>
              <p className="mt-2 text-sm text-gray-500">{t('summary.planId', { id: activePlan.userPlanId.slice(0, 8) })}</p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                <span>{t('summary.remainingCredits')}</span>
                <Gauge size={16} className="text-blue-600" />
              </div>
              <div className="mt-4 text-2xl font-bold text-gray-900">{formatNumber(activePlan.remainingCredits)}</div>
              <p className="mt-2 text-sm text-gray-500">
                {t('summary.usedOfTotal', {
                  used: formatNumber(activePlan.includedCreditsUsed),
                  total: formatNumber(activePlan.includedCredits),
                })}
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                <span>{t('summary.expiresAt')}</span>
                <CalendarClock size={16} className="text-blue-600" />
              </div>
              <div className="mt-4 text-lg font-bold text-gray-900">{formatDate(activePlan.expiresAt)}</div>
              <p className="mt-2 text-sm text-gray-500">{t('summary.purchasedAt', { date: formatDate(activePlan.purchasedAt) })}</p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                <span>{t('summary.extraCredits')}</span>
                <ShieldCheck size={16} className="text-blue-600" />
              </div>
              <div className="mt-4 text-2xl font-bold text-gray-900">{formatNumber(activePlan.extraCreditsAvailable)}</div>
              <p className="mt-2 text-sm text-gray-500">
                {t('summary.expiredUnused', { count: formatNumber(activePlan.extraCreditsExpiredUnused) })}
              </p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('usage.title')}</h2>
                  <p className="mt-1 text-sm text-gray-500">{t('usage.subtitle')}</p>
                </div>
                <Badge variant={usagePercent >= 80 ? 'warning' : 'success'}>{formatPercent(usagePercent)}</Badge>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{t('usage.progressLabel')}</span>
                  <span className="font-semibold text-gray-900">
                    {formatNumber(activePlan.includedCreditsUsed)} / {formatNumber(activePlan.includedCredits)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-gray-100">
                  <div className="h-3 rounded-full bg-blue-600 transition-all" style={{ width: `${usagePercent}%` }} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{t('usage.remaining')}</div>
                    <div className="mt-2 text-xl font-bold text-gray-900">{formatNumber(activePlan.remainingCredits)}</div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{t('usage.extraPurchases')}</div>
                    <div className="mt-2 text-xl font-bold text-gray-900">{formatNumber(activePlan.extraPurchaseCount)}</div>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{t('usage.extraAvailable')}</div>
                    <div className="mt-2 text-xl font-bold text-gray-900">{formatNumber(activePlan.extraCreditsAvailable)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">{t('extra.title')}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('extra.subtitle')}</p>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{t('extra.eligibility')}</div>
                  <div className="mt-2 text-lg font-bold text-gray-900">
                    {activePlan.canBuyExtraCredit ? t('extra.allowed') : t('extra.blocked')}
                  </div>
                  {!activePlan.canBuyExtraCredit && activePlan.cannotBuyExtraCreditReason && (
                    <p className="mt-2 text-sm text-red-600">{activePlan.cannotBuyExtraCreditReason}</p>
                  )}
                </div>

                {extraRules && (
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-center justify-between gap-4">
                        <span>{t('extra.price')}</span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(extraRules.price_cents, extraRules.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>{t('extra.expiresIn')}</span>
                        <span className="font-semibold text-gray-900">{t('extra.months', { count: extraRules.expires_in_months })}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>{t('extra.minUsage')}</span>
                        <span className="font-semibold text-gray-900">{t('extra.percent', { value: extraRules.min_consumed_percent })}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>{t('extra.maxPurchases')}</span>
                        <span className="font-semibold text-gray-900">{formatNumber(extraRules.max_purchases_per_plan)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!activePlan.canBuyExtraCredit || extraCreditMutation.isPending}
                  onClick={() => extraCreditMutation.mutate()}
                >
                  {extraCreditMutation.isPending ? t('actions.processing') : t('actions.buyExtraCredit')}
                </Button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">{t('access.title')}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('access.subtitle')}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {tools.length > 0 ? (
                  tools.map((tool) => (
                    <Badge key={tool} variant="outline">
                      {tool}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">{t('access.allTools')}</Badge>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900">{t('restrictions.title')}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('restrictions.subtitle')}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant={matchingPlan?.restrictions?.allow_auth_scanning ? 'success' : 'warning'}>
                  {matchingPlan?.restrictions?.allow_auth_scanning ? t('restrictions.authAllowed') : t('restrictions.authBlocked')}
                </Badge>
                <Badge variant={matchingPlan?.restrictions?.allow_bruteforce ? 'success' : 'warning'}>
                  {matchingPlan?.restrictions?.allow_bruteforce ? t('restrictions.bruteforceAllowed') : t('restrictions.bruteforceBlocked')}
                </Badge>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
