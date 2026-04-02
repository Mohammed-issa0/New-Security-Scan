'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Sparkles, Star, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '@/lib/auth/tokenStore';
import { authService } from '@/lib/auth/authService';
import type { UserProfile } from '@/lib/api/types';
import { plansService } from '@/lib/plans/plansService';
import type { CheckoutSessionResponse, PlanPublicResponse, PurchaseExtraScanResponse, PurchasePlanResponse } from '@/lib/plans/types';
import { ApiRequestError } from '@/lib/api/client';
import { findMatchingPlanDefinition, getCreditsUsagePercent, getPlanDisplayName, getPlanTools } from '@/lib/plans/utils';
import { Alert, Badge, Button } from '@/components/scans/ui';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    const payload = error.data as Record<string, unknown> | undefined;
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

export function PlansPageContent({
  variant = 'public',
  mode = 'full',
}: {
  variant?: 'public' | 'app';
  mode?: 'full' | 'section';
}) {
  const t = useTranslations('plansPage');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isCompact = variant === 'app';
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [activePurchase, setActivePurchase] = React.useState<string | null>(null);
  const hasToastedStatus = React.useRef(false);
  const billingMode = process.env.NEXT_PUBLIC_BILLING_MODE || 'stripe';
  const checkoutStatus = searchParams.get('status');

  const { data: plansData, isLoading: plansLoading, isError: plansError } = useQuery({
    queryKey: ['plans-public'],
    queryFn: () => plansService.listPublic(),
  });

  const { data: activePlan, isLoading: activePlanLoading } = useQuery({
    queryKey: ['plans-active'],
    queryFn: async () => {
      try {
        return await plansService.getActivePlan();
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: isAuthenticated,
  });

  const matchedActivePlan = findMatchingPlanDefinition(activePlan, plansData);

  const checkoutPlanMutation = useMutation<CheckoutSessionResponse | PurchasePlanResponse, Error, string>({
    mutationFn: (planName: string) =>
      billingMode === 'direct'
        ? plansService.purchasePlanDirect(planName)
        : plansService.checkoutPlan(planName),
    onSuccess: (response) => {
      if (billingMode === 'direct') {
        queryClient.invalidateQueries({ queryKey: ['plans-active'] });
        const successMessage = 'message' in response && response?.message ? response.message : t('actions.checkoutSuccess');
        toast.success(successMessage);
        return;
      }
      if ('url' in response && response?.url) {
        window.location.href = response.url;
      } else {
        toast.error(t('actions.checkoutMissing'));
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t('actions.checkoutError')));
    },
    onSettled: () => setActivePurchase(null),
  });

  const checkoutExtraCreditMutation = useMutation<CheckoutSessionResponse | PurchaseExtraScanResponse, Error, void>({
    mutationFn: () =>
      billingMode === 'direct'
        ? plansService.purchaseExtraScanDirect()
        : plansService.checkoutExtraCredit(),
    onSuccess: (response) => {
      if (billingMode === 'direct') {
        queryClient.invalidateQueries({ queryKey: ['plans-active'] });
        const successMessage = 'message' in response && response?.message ? response.message : t('actions.extraSuccess');
        toast.success(successMessage);
        return;
      }
      if ('url' in response && response?.url) {
        window.location.href = response.url;
      } else {
        toast.error(t('actions.checkoutMissing'));
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t('actions.extraError')));
    },
  });

  React.useEffect(() => {
    setIsAuthenticated(!!tokenStore.getTokens()?.accessToken);
    return tokenStore.subscribe((tokens) => {
      setIsAuthenticated(!!tokens?.accessToken);
    });
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await authService.getMe();
        if (isMounted) setProfile(data);
      } catch {
        if (isMounted) setProfile(null);
      }
    };

    if (isAuthenticated) {
      loadProfile();
    } else {
      setProfile(null);
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!checkoutStatus || hasToastedStatus.current) {
      return;
    }

    if (checkoutStatus === 'success') {
      toast.success(t('status.success.toast'));
      hasToastedStatus.current = true;
      return;
    }

    if (checkoutStatus === 'cancel' || checkoutStatus === 'failed') {
      toast.error(t(`status.${checkoutStatus}.toast`));
      hasToastedStatus.current = true;
    }
  }, [checkoutStatus, t]);

  React.useEffect(() => {
    if (checkoutStatus === 'success') {
      queryClient.invalidateQueries({ queryKey: ['plans-active'] });
    }
  }, [checkoutStatus, queryClient]);

  const sortedPlans = React.useMemo(() => {
    const plans = plansData ? [...plansData] : [];
    return plans.sort((a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0));
  }, [plansData]);

  const formatPrice = (plan: PlanPublicResponse) => {
    if (plan.priceCents === 0) return t('plans.free');
    const currency = (plan.currency || 'USD').toUpperCase();
    const amount = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(plan.priceCents / 100);
    return amount;
  };

  const formatCredits = (value?: number) => new Intl.NumberFormat(locale).format(value ?? 0);
  const formatExtraRule = (plan: PlanPublicResponse) => {
    if (!plan.extraCredit) {
      return t('compare.notAvailable');
    }

    return t('compare.extraCreditRule', {
      price: formatPrice({
        ...plan,
        priceCents: plan.extraCredit.price_cents,
        currency: plan.extraCredit.currency || plan.currency,
      }),
      usage: plan.extraCredit.min_consumed_percent,
      max: plan.extraCredit.max_purchases_per_plan,
    });
  };

  const usedCredits = activePlan?.includedCreditsUsed ?? 0;
  const totalCredits = activePlan?.includedCredits ?? 0;
  const usedPercent = getCreditsUsagePercent(activePlan);

  const showFull = mode === 'full';
  const compareRows = [
    {
      key: 'price',
      label: t('compare.rows.price'),
      render: (plan: PlanPublicResponse) => formatPrice(plan),
    },
    {
      key: 'credits',
      label: t('compare.rows.credits'),
      render: (plan: PlanPublicResponse) => formatCredits(plan.includedScanCredits),
    },
    {
      key: 'runtime',
      label: t('compare.rows.runtime'),
      render: (plan: PlanPublicResponse) => t('compare.runtimeValue', { minutes: plan.maxRuntimeMinutes }),
    },
    {
      key: 'tools',
      label: t('compare.rows.tools'),
      render: (plan: PlanPublicResponse) => {
        const tools = getPlanTools(plan);
        return tools.length > 0 ? tools.join(', ') : t('plansSection.toolsAll');
      },
    },
    {
      key: 'auth',
      label: t('compare.rows.authScanning'),
      render: (plan: PlanPublicResponse) =>
        plan.restrictions?.allow_auth_scanning ? t('plansSection.allowAuth') : t('plansSection.blockAuth'),
    },
    {
      key: 'bruteforce',
      label: t('compare.rows.bruteforce'),
      render: (plan: PlanPublicResponse) =>
        plan.restrictions?.allow_bruteforce ? t('plansSection.allowBrute') : t('plansSection.blockBrute'),
    },
    {
      key: 'extra',
      label: t('compare.rows.extraCredit'),
      render: (plan: PlanPublicResponse) => formatExtraRule(plan),
    },
  ];

  return (
    <div className={isCompact ? 'space-y-10' : 'space-y-16'}>
      {showFull && (
        <section className={`app-panel relative overflow-hidden rounded-3xl ${
          isCompact ? 'p-6 md:p-8' : 'p-8 md:p-12'
        }`}>
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

          <div className="relative max-w-3xl space-y-4">
            <Badge variant="outline" className="bg-white/8">
              <Sparkles size={14} className="mr-2" />
              {t('hero.badge')}
            </Badge>
            <h1 className={`${isCompact ? 'text-3xl' : 'text-4xl md:text-5xl'} font-extrabold text-text-primary leading-tight`}>
              {t('hero.title')}
            </h1>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              {t('hero.note')}
            </p>
          </div>
        </section>
      )}

      {checkoutStatus && (
        <Alert variant={checkoutStatus === 'success' ? 'success' : 'warning'} title={t(`status.${checkoutStatus}.title`)}>
          {t(`status.${checkoutStatus}.description`)}
        </Alert>
      )}

      {showFull && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">{t('current.title')}</h2>
              <p className="text-sm text-text-secondary">{t('current.subtitle')}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/14 bg-white/6 p-6 shadow-sm">
            {!isAuthenticated ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-text-primary">{t('current.signedOutTitle')}</div>
                  <p className="text-sm text-text-secondary">{t('current.signedOutDesc')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/${locale}/login`}>
                    <Button variant="primary" size="sm">
                      {t('current.loginCta')}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/register`}>
                    <Button variant="outline" size="sm">
                      {t('current.registerCta')}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-semibold text-text-primary">
                    <User size={18} />
                    {t('current.signedInTitle', { name: profile?.fullName || profile?.email || t('current.userFallback') })}
                  </div>
                  <p className="text-sm text-text-secondary">{t('current.signedInDesc')}</p>
                  {activePlanLoading ? (
                    <div className="text-sm text-text-secondary">{t('current.loading')}</div>
                  ) : !activePlan ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-400/12 px-3 py-1 text-xs font-semibold text-cyan-200">
                      <Star size={14} />
                      {t('current.noPlanLabel')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                        <Badge variant="outline">{getPlanDisplayName(matchedActivePlan || activePlan) || t('current.unknownPlan')}</Badge>
                        <span>{t('current.expiresAt', { date: new Date(activePlan.expiresAt).toLocaleDateString(locale) })}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                          <span>{t('current.usageLabel')}</span>
                          <span>{t('current.usageValue', { used: formatCredits(usedCredits), total: formatCredits(totalCredits) })}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/10">
                          <div
                            className="h-2 rounded-full bg-cyan-300 transition-all"
                            style={{ width: `${usedPercent}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                          <span>{t('current.remaining', { count: formatCredits(activePlan.remainingCredits) })}</span>
                          <span>{t('current.extraAvailable', { count: formatCredits(activePlan.extraCreditsAvailable) })}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {isAuthenticated && (
                    <Link href={`/${locale}/billing`}>
                      <Button variant="outline" size="sm">
                        {t('current.managePlanCta')}
                      </Button>
                    </Link>
                  )}
                  <Link href={`/${locale}/scans/new`}>
                    <Button variant="primary" size="sm">
                      {t('current.primaryCta')}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {isAuthenticated && activePlan && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/14 bg-white/6 p-5">
                <div className="text-xs font-semibold text-text-muted">{t('current.extraCreditsTitle')}</div>
                <div className="mt-2 text-2xl font-semibold text-text-primary">
                  {formatCredits(activePlan.extraCreditsAvailable)}
                </div>
                <div className="mt-1 text-xs text-text-secondary">
                  {t('current.extraExpired', { count: formatCredits(activePlan.extraCreditsExpiredUnused) })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/14 bg-white/6 p-5">
                <div className="text-xs font-semibold text-text-muted">{t('current.extraPurchaseTitle')}</div>
                <div className="mt-2 text-2xl font-semibold text-text-primary">
                  {formatCredits(activePlan.extraPurchaseCount)}
                </div>
                <div className="mt-1 text-xs text-text-secondary">
                  {t('current.extraPurchaseNote')}
                </div>
              </div>
              <div className="rounded-2xl border border-white/14 bg-white/6 p-5">
                <div className="text-xs font-semibold text-text-muted">{t('current.extraEligibilityTitle')}</div>
                <div className="mt-2 text-sm font-semibold text-text-primary">
                  {activePlan.canBuyExtraCredit ? t('current.extraEligible') : t('current.extraNotEligible')}
                </div>
                {!activePlan.canBuyExtraCredit && activePlan.cannotBuyExtraCreditReason && (
                  <div className="mt-2 text-xs text-status-danger">{activePlan.cannotBuyExtraCreditReason}</div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!activePlan.canBuyExtraCredit || checkoutExtraCreditMutation.isPending}
                    onClick={() => checkoutExtraCreditMutation.mutate()}
                  >
                    {checkoutExtraCreditMutation.isPending ? t('actions.processing') : t('actions.buyExtra')}
                  </Button>
                  <Link href={`/${locale}/billing`}>
                    <Button variant="ghost" size="sm">{t('current.managePlanCta')}</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-text-primary">{t('plansSection.title')}</h2>
          <p className="text-sm text-text-secondary">{t('plansSection.subtitle')}</p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {plansLoading ? (
            <div className="col-span-full text-sm text-text-secondary">{t('plansSection.loading')}</div>
          ) : plansError ? (
            <div className="col-span-full text-sm text-status-danger">{t('plansSection.error')}</div>
          ) : (
            sortedPlans.map((plan, index) => {
              const highlight = index === 1 && sortedPlans.length >= 3;
              return (
                <motion.div
                  key={plan.planName || `plan-${index}`}
                  variants={itemVariants}
                  className={`relative rounded-3xl border ${
                    highlight ? 'border-cyan-300/40 shadow-xl shadow-cyan-900/20' : 'border-white/14'
                  } bg-white/6 p-6 flex flex-col gap-6`}
                >
                  {highlight && (
                    <div className="absolute -top-3 right-6 rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
                      {t('plansSection.popular')}
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
                      {getPlanDisplayName(plan) || t('plansSection.planFallback')}
                    </div>
                    <div className="text-2xl font-bold text-text-primary">
                      {getPlanDisplayName(plan) || t('plansSection.planFallback')}
                    </div>
                    <p className="text-sm text-text-secondary">
                      {t('plansSection.description', { credits: formatCredits(plan.includedScanCredits) })}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                    <div className="text-3xl font-extrabold text-text-primary">
                      {formatPrice(plan)}
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                      {t('plansSection.period', { months: plan.expiresInMonths })}
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-text-secondary">
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 text-cyan-300" />
                      <span>{t('plansSection.credits', { count: formatCredits(plan.includedScanCredits) })}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 text-cyan-300" />
                      <span>{t('plansSection.runtime', { minutes: formatCredits(plan.maxRuntimeMinutes) })}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 text-cyan-300" />
                      <span>{t('plansSection.toolsLabel')}</span>
                    </li>
                    <div className="flex flex-wrap gap-2">
                      {getPlanTools(plan).length === 0 ? (
                        <Badge variant="outline">{t('plansSection.toolsAll')}</Badge>
                      ) : (
                        getPlanTools(plan).map((tool) => (
                          <Badge key={tool} variant="outline">
                            {tool}
                          </Badge>
                        ))
                      )}
                    </div>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 text-cyan-300" />
                      <span>{t('plansSection.restrictionsLabel')}</span>
                    </li>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={plan.restrictions?.allow_auth_scanning ? 'success' : 'warning'}>
                        {plan.restrictions?.allow_auth_scanning
                          ? t('plansSection.allowAuth')
                          : t('plansSection.blockAuth')}
                      </Badge>
                      <Badge variant={plan.restrictions?.allow_bruteforce ? 'success' : 'warning'}>
                        {plan.restrictions?.allow_bruteforce
                          ? t('plansSection.allowBrute')
                          : t('plansSection.blockBrute')}
                      </Badge>
                    </div>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 text-cyan-300" />
                      <span>{t('plansSection.extraCreditLabel')}</span>
                    </li>
                    <p className="text-sm leading-6 text-text-secondary">{formatExtraRule(plan)}</p>
                  </ul>
                  <div className="mt-auto">
                    <Button
                      variant={highlight ? 'primary' : 'outline'}
                      size="sm"
                      className="w-full"
                      disabled={!plan.planName || checkoutPlanMutation.isPending}
                      onClick={() => {
                        if (!plan.planName) return;
                        setActivePurchase(plan.planName);
                        checkoutPlanMutation.mutate(plan.planName);
                      }}
                    >
                      {checkoutPlanMutation.isPending && activePurchase === plan.planName
                        ? t('actions.processing')
                        : t('actions.choosePlan')}
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </section>

      {showFull && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text-primary">{t('compare.title')}</h2>
            <p className="text-sm text-text-secondary">{t('compare.subtitle')}</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/14 bg-white/6 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-white/8">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-text-muted">{t('compare.featureColumn')}</th>
                    {sortedPlans.map((plan) => (
                      <th key={plan.planName || getPlanDisplayName(plan) || 'plan'} className="px-6 py-4 text-left font-semibold text-text-primary">
                        <div className="space-y-1">
                          <div>{getPlanDisplayName(plan) || t('plansSection.planFallback')}</div>
                          <div className="text-xs font-medium text-text-muted">{formatPrice(plan)}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {compareRows.map((row) => (
                    <tr key={row.key} className="align-top">
                      <td className="px-6 py-4 font-semibold text-text-secondary">{row.label}</td>
                      {sortedPlans.map((plan) => (
                        <td key={`${row.key}-${plan.planName || row.label}`} className="px-6 py-4 text-text-secondary">
                          {row.render(plan)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {showFull && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-text-primary">{t('faq.title')}</h2>
            <p className="text-sm text-text-secondary">{t('faq.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(t.raw('faq.items') as { q: string; a: string }[]).map((item) => (
              <div key={item.q} className="rounded-2xl border border-white/14 bg-white/6 p-5">
                <div className="text-sm font-semibold text-text-primary">{item.q}</div>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
