'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { User, Mail, AlertCircle, CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

import { profileService } from '@/lib/profile/profileService';
import { plansService } from '@/lib/plans/plansService';
import { ApiRequestError } from '@/lib/api/client';
import { Card, CardHeader, CardContent, Input, Label, Button, Alert, Badge } from '@/components/scans/ui';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const queryClient = useQueryClient();
  const [fullName, setFullName] = React.useState('');
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [formMessage, setFormMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => profileService.getMe(),
  });

  const {
    data: activePlan,
    isLoading: isPlanLoading,
    isError: isPlanError,
    error: planError,
    refetch: refetchPlan,
  } = useQuery({
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
  });

  React.useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setFieldError(null);
      setFormMessage(null);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (name: string) => profileService.updateMe({ fullName: name }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile-me'], updated);
      setFormMessage({ type: 'success', text: t('messages.saved') });
      toast.success(t('messages.saved'));
    },
    onError: (error: any) => {
      const isApiError = error instanceof ApiRequestError;
      const fieldMessage = isApiError ? error.data?.details?.fullName?.[0] : null;
      const message =
        fieldMessage ||
        (isApiError
          ? error.data?.message || error.data?.detail || error.data?.error || error.message
          : error?.message || t('messages.saveError'));

      if (fieldMessage) {
        setFieldError(fieldMessage);
      }

      setFormMessage({ type: 'error', text: message });
      toast.error(message);
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormMessage(null);

    const trimmed = fullName.trim();
    if (!trimmed) {
      setFieldError(t('messages.nameRequired'));
      return;
    }

    setFieldError(null);
    updateMutation.mutate(trimmed);
  };

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : t('labels.notAvailable');

  const usedCredits = activePlan?.includedCreditsUsed ?? 0;
  const totalCredits = activePlan?.includedCredits ?? 0;
  const usedPercent = totalCredits > 0 ? Math.min(100, Math.round((usedCredits / totalCredits) * 100)) : 0;
  const remainingCredits = activePlan?.remainingCredits ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <Alert variant="error" title={t('messages.loadError')}>
          <div className="flex items-center justify-between gap-4">
            <span>{t('messages.loadErrorDesc')}</span>
            <Button type="button" size="sm" onClick={() => refetch()}>
              {t('actions.retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <Alert variant="info" title={t('messages.empty')}>
          {t('messages.emptyDesc')}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t('card.title')}
            description={t('card.subtitle')}
            icon={User}
          />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formMessage && (
                <Alert
                  variant={formMessage.type === 'success' ? 'success' : 'error'}
                  title={formMessage.type === 'success' ? t('messages.savedTitle') : t('messages.saveErrorTitle')}
                >
                  <div className="flex items-start gap-2">
                    {formMessage.type === 'success' ? (
                      <CheckCircle2 size={16} className="mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="mt-0.5" />
                    )}
                    <span>{formMessage.text}</span>
                  </div>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label required htmlFor="fullName">{t('fields.name')}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      if (fieldError) setFieldError(null);
                    }}
                    placeholder={t('placeholders.name')}
                  />
                  {fieldError && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {fieldError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">{t('fields.email')}</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      value={profile.email || ''}
                      disabled
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? t('actions.saving') : t('actions.save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={t('details.title')}
            description={t('details.subtitle')}
            icon={ShieldCheck}
          />
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('labels.status')}</span>
              <Badge variant={profile.isActive ? 'success' : 'warning'}>
                {profile.isActive ? t('labels.active') : t('labels.inactive')}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('labels.createdAt')}</span>
              <span className="font-medium text-gray-900">{formatDate(profile.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('labels.lastLogin')}</span>
              <span className="font-medium text-gray-900">{formatDate(profile.lastLoginAt)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{t('labels.roles')}</span>
              <span className="font-medium text-gray-900 text-right">
                {profile.roles?.length ? profile.roles.join(', ') : t('labels.rolesEmpty')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={t('plan.title')}
          description={t('plan.subtitle')}
          icon={CreditCard}
        />
        <CardContent className="space-y-4">
          {isPlanLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isPlanLoading && isPlanError && (
            <Alert variant="error" title={t('plan.error')}>
              <div className="flex items-center justify-between gap-4">
                <span>{planError instanceof Error ? planError.message : t('plan.errorDesc')}</span>
                <Button type="button" size="sm" onClick={() => refetchPlan()}>
                  {t('actions.retry')}
                </Button>
              </div>
            </Alert>
          )}

          {!isPlanLoading && !isPlanError && !activePlan && (
            <Alert variant="info" title={t('plan.empty')}>
              {t('plan.emptyDesc')}
            </Alert>
          )}

          {!isPlanLoading && !isPlanError && activePlan && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-400">{t('plan.labels.name')}</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{activePlan.planName || t('labels.notAvailable')}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-400">{t('plan.labels.expiresAt')}</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{formatDate(activePlan.expiresAt)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-400">{t('plan.labels.purchasedAt')}</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{formatDate(activePlan.purchasedAt)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t('plan.labels.creditsUsage')}</span>
                  <span className="font-medium text-gray-900">
                    {usedCredits} / {totalCredits}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-2 bg-blue-600" style={{ width: `${usedPercent}%` }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('plan.labels.remaining')}</span>
                    <span className="font-semibold text-gray-900">{remainingCredits}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('plan.labels.extraCredits')}</span>
                    <span className="font-semibold text-gray-900">{activePlan.extraCreditsAvailable}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('plan.labels.extraPurchases')}</span>
                    <span className="font-semibold text-gray-900">{activePlan.extraPurchaseCount}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{t('plan.labels.canBuyExtra')}</span>
                <Badge variant={activePlan.canBuyExtraCredit ? 'success' : 'warning'}>
                  {activePlan.canBuyExtraCredit ? t('plan.labels.allowed') : t('plan.labels.blocked')}
                </Badge>
              </div>
              {!activePlan.canBuyExtraCredit && activePlan.cannotBuyExtraCreditReason && (
                <Alert variant="warning" title={t('plan.labels.blocked')}>
                  {activePlan.cannotBuyExtraCreditReason}
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
