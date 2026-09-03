'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileScanFormSchema, ProfileScanFormSchemaType } from '@/lib/scans/schema';
import { buildProfilePayload } from '@/lib/scans/mappers';
import { startScanWithAdapter } from '@/lib/scans/adapter';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Globe, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button, Card, CardHeader, CardContent, Input, Label, Textarea, Checkbox, Alert } from './ui';
import { ScanSummary } from './ScanSummary';
import { CreditBudgetSelector } from './CreditBudgetSelector';
import { ProfileSelector } from './ProfileSelector';
import { JsonPreviewDialog } from './JsonPreviewDialog';
import { TargetPicker } from './TargetPicker';
import { motion } from 'framer-motion';
import { scansService } from '@/lib/scans/scansService';
import { plansService } from '@/lib/plans/plansService';
import { ApiRequestError } from '@/lib/api/client';
import { countActiveScans, getPlanMaxConcurrentScans } from '@/lib/scans/concurrency';
import { parseScanCreateError } from '@/lib/scans/errorMessages';
import { getCreditMinutesPerUnit, getMaxCreditBudget } from '@/lib/plans/creditBudget';
import type { ScanProfile, TargetBrowserAuthRequest } from '@/lib/api/types';

import { ensureTargetUrlScheme, isValidTargetUrl, normalizeTargetUrlForCompare } from '@/lib/targets/urlUtils';

const emptyBrowserAuth: TargetBrowserAuthRequest = {
  loginUrl: '',
  targetUrl: '',
  username: '',
  password: '',
  mfa: false,
};

export default function ScanForm() {
  const t = useTranslations('scanForm');
  const tTargetAuth = useTranslations('landing.targets.browserAuth');
  const locale = useLocale();
  const router = useRouter();
  const loginUrlId = useId();
  const targetUrlOverrideId = useId();
  const usernameId = useId();
  const passwordId = useId();
  const mfaId = useId();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [manualTargetUrl, setManualTargetUrl] = useState('');
  const [showBrowserAuth, setShowBrowserAuth] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [browserAuth, setBrowserAuth] = useState<TargetBrowserAuthRequest>(emptyBrowserAuth);
  const [browserAuthError, setBrowserAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ProfileScanFormSchemaType>({
    resolver: zodResolver(profileScanFormSchema),
    mode: 'onChange',
    defaultValues: {
      targetId: '',
      targets: '',
      profile: 'standard',
      scopeSigned: true,
      creditBudget: 2,
      name: '',
      notes: '',
    },
  });

  const formValues = watch();
  const selectedProfile = watch('profile');
  const creditBudget = watch('creditBudget') ?? 1;

  const { data: targetsData, isLoading: targetsLoading } = useQuery({
    queryKey: ['scan-form-targets'],
    queryFn: () => scansService.getTargets(1, 100),
  });

  const selectedExistingTarget = useMemo(
    () => targetsData?.items?.find((target) => target.id === formValues.targetId),
    [targetsData?.items, formValues.targetId]
  );
  const canConfigureBrowserAuth =
    Boolean(manualTargetUrl.trim()) && !selectedExistingTarget?.browserAuthConfigured;

  const { data: toolConfigSchema } = useQuery({
    queryKey: ['scan-tool-config-schema'],
    queryFn: () => scansService.getToolConfigSchema(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans-public'],
    queryFn: () => plansService.listPublic(),
  });

  const { data: activePlan } = useQuery({
    queryKey: ['plans-active'],
    queryFn: () => plansService.getActivePlan(),
  });

  const { data: activeScansData } = useQuery({
    queryKey: ['scans-active-count'],
    queryFn: () => scansService.getScans(1, 50),
  });

  const planName = activePlan?.planName?.trim().toLowerCase();
  const currentPlan = useMemo(
    () => plansData?.find((plan) => plan.planName?.trim().toLowerCase() === planName),
    [planName, plansData]
  );

  const planMaxRuntimeMinutes = currentPlan?.maxRuntimeMinutes ?? currentPlan?.max_runtime_minutes;
  const creditMinutesPerUnit = getCreditMinutesPerUnit(planName);
  const maxCreditBudget = getMaxCreditBudget(planName);
  const remainingCredits = activePlan?.remainingCredits ?? 0;
  const maxConcurrentScans = getPlanMaxConcurrentScans(currentPlan);
  const activeScanCount = useMemo(
    () => countActiveScans(activeScansData?.items ?? []),
    [activeScansData?.items]
  );
  const isConcurrencyBlocked =
    maxConcurrentScans > 0 && activeScanCount >= maxConcurrentScans;
  const hasNoCreditsRemaining = remainingCredits <= 0;

  useEffect(() => {
    const schemaProfile = toolConfigSchema?.profiles?.find(
      (p) => p.name === selectedProfile
    );
    if (schemaProfile?.defaultCredits != null) {
      setValue(
        'creditBudget',
        Math.min(schemaProfile.defaultCredits, remainingCredits || 1, maxCreditBudget)
      );
    }
    // Only sync default credits when profile/schema changes — not when remainingCredits refetches
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid resetting user's budget pick
  }, [selectedProfile, toolConfigSchema?.profiles, setValue, maxCreditBudget]);

  const onSubmit = async (data: ProfileScanFormSchemaType) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    const typedTargetUrl = ensureTargetUrlScheme(manualTargetUrl.trim());
    const selectedTarget = targetsData?.items?.find((target) => target.id === data.targetId);
    let resolvedTargetUrl = data.targets?.trim() || selectedTarget?.url || '';

    if (typedTargetUrl) {
      if (!isValidTargetUrl(typedTargetUrl)) {
        const message = t('messages.invalidUrl');
        setError('targets', { message });
        setSubmissionError(message);
        toast.error(message);
        setIsSubmitting(false);
        return;
      }

      const normalizedTypedUrl = normalizeTargetUrlForCompare(typedTargetUrl);
      const existingTarget = targetsData?.items?.find(
        (target) => normalizeTargetUrlForCompare(target.url) === normalizedTypedUrl
      );

      if (existingTarget) {
        resolvedTargetUrl = existingTarget.url;
        data.targetId = existingTarget.id;
      } else {
        try {
          const createdTarget = await scansService.createTarget(typedTargetUrl);
          resolvedTargetUrl = createdTarget.url || typedTargetUrl;
          data.targetId = createdTarget.id;
        } catch (error: unknown) {
          const err = error as { data?: { message?: string }; message?: string };
          const backendMessage = err?.message || t('messages.error');
          setError('targets', { message: backendMessage });
          setSubmissionError(backendMessage);
          toast.error(backendMessage);
          setIsSubmitting(false);
          return;
        }
      }
    }

    if (!resolvedTargetUrl || !data.targetId) {
      const message = t('fields.target.required');
      setError('targets', { message });
      setSubmissionError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    data.targets = resolvedTargetUrl;
    setValue('targets', resolvedTargetUrl);
    setValue('targetId', data.targetId);
    clearErrors('targets');

    const hasBrowserAuthInput =
      canConfigureBrowserAuth &&
      showBrowserAuth &&
      Boolean(
        browserAuth.loginUrl?.trim() ||
          browserAuth.targetUrl?.trim() ||
          browserAuth.username?.trim() ||
          browserAuth.password?.trim() ||
          browserAuth.mfa
      );

    if (hasBrowserAuthInput) {
      if (!browserAuth.username?.trim()) {
        const message = tTargetAuth('validation.usernameRequired');
        setBrowserAuthError(message);
        setSubmissionError(message);
        toast.error(message);
        setIsSubmitting(false);
        return;
      }
      if (!browserAuth.password?.trim()) {
        const message = tTargetAuth('validation.passwordRequired');
        setBrowserAuthError(message);
        setSubmissionError(message);
        toast.error(message);
        setIsSubmitting(false);
        return;
      }

      try {
        await scansService.setTargetBrowserAuth(data.targetId, {
          loginUrl: browserAuth.loginUrl?.trim() || null,
          targetUrl: browserAuth.targetUrl?.trim() || null,
          username: browserAuth.username.trim(),
          password: browserAuth.password.trim(),
          mfa: browserAuth.mfa,
        });
        setBrowserAuthError(null);
      } catch (error: unknown) {
        const err = error as { data?: { message?: string }; message?: string };
        const message = err?.message || tTargetAuth('feedback.saveError');
        setBrowserAuthError(message);
        setSubmissionError(message);
        toast.error(message);
        setIsSubmitting(false);
        return;
      }
    }

    if (hasNoCreditsRemaining) {
      const message = t('messages.noCreditsRemaining');
      setSubmissionError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    if (data.creditBudget > remainingCredits) {
      const message = t('messages.insufficientCredits', {
        requested: data.creditBudget,
        available: remainingCredits,
      });
      setError('creditBudget', { message });
      setSubmissionError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    if (data.creditBudget > maxCreditBudget) {
      const message = t('messages.creditBudgetExceedsPlan', { max: maxCreditBudget });
      setError('creditBudget', { message });
      setSubmissionError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    if (isConcurrencyBlocked) {
      const message = t('messages.concurrentLimit', {
        active: activeScanCount,
        max: maxConcurrentScans,
      });
      setSubmissionError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    try {
      const createdScan = await startScanWithAdapter(data);
      toast.success(t('messages.success'));
      setSubmissionSuccess(true);
      reset();
      setManualTargetUrl('');
      setShowBrowserAuth(false);
      setShowPassword(false);
      setBrowserAuth(emptyBrowserAuth);
      setBrowserAuthError(null);
      if (createdScan?.id) {
        router.push(`/${locale}/scans/${createdScan.id}`);
      } else {
        router.push(`/${locale}/scans`);
      }
    } catch (error: unknown) {
      const parsed =
        error instanceof ApiRequestError
          ? parseScanCreateError(error.data, error.message)
          : parseScanCreateError(undefined, (error as Error)?.message || t('messages.error'));

      if (parsed.action === 'inline_credit_budget') {
        setError('creditBudget', { message: parsed.message });
      }

      if (parsed.action === 'redirect_billing') {
        router.push(`/${locale}/billing`);
      }

      setSubmissionError(parsed.message);
      toast.error(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPayload = (() => {
    const base = (() => {
      try {
        return buildProfilePayload(formValues);
      } catch {
        // Preview for developers even before target is selected
        return {
          targetId: formValues.targetId?.trim() || '',
          profile: formValues.profile,
          creditBudget: formValues.creditBudget ?? 1,
          name: formValues.name || undefined,
          notes: formValues.notes || undefined,
          scopeSigned: formValues.scopeSigned,
        };
      }
    })();

    return {
      ...base,
      // Not part of the scan-creation request body, but resolved into a
      // target before submit — shown here so the preview reflects the
      // full create flow, not just the final POST payload.
      targets: formValues.targets || manualTargetUrl || undefined,
      ...(showBrowserAuth && canConfigureBrowserAuth ? { browserAuth } : {}),
    };
  })();

  const handleApplyJsonPayload = (parsed: unknown): boolean => {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return false;
    }
    const data = parsed as Record<string, unknown>;
    const setOptions = { shouldValidate: true, shouldDirty: true } as const;

    if (typeof data.name === 'string') setValue('name', data.name, setOptions);
    if (typeof data.notes === 'string') setValue('notes', data.notes, setOptions);
    if (typeof data.profile === 'string') {
      setValue('profile', data.profile as ProfileScanFormSchemaType['profile'], setOptions);
    }
    if (typeof data.creditBudget === 'number') setValue('creditBudget', data.creditBudget, setOptions);
    if (typeof data.scopeSigned === 'boolean') setValue('scopeSigned', data.scopeSigned, setOptions);
    if (typeof data.targetId === 'string') setValue('targetId', data.targetId, setOptions);
    if (typeof data.targets === 'string') {
      setValue('targets', data.targets, setOptions);
      setManualTargetUrl(data.targets);
    }

    if (data.browserAuth && typeof data.browserAuth === 'object' && !Array.isArray(data.browserAuth)) {
      const auth = data.browserAuth as Record<string, unknown>;
      const nextAuth: TargetBrowserAuthRequest = {
        loginUrl: typeof auth.loginUrl === 'string' ? auth.loginUrl : '',
        targetUrl: typeof auth.targetUrl === 'string' ? auth.targetUrl : '',
        username: typeof auth.username === 'string' ? auth.username : '',
        password: typeof auth.password === 'string' ? auth.password : '',
        mfa: typeof auth.mfa === 'boolean' ? auth.mfa : false,
      };
      setBrowserAuth(nextAuth);
      if (nextAuth.username || nextAuth.password || nextAuth.loginUrl || nextAuth.targetUrl) {
        setShowBrowserAuth(true);
      }
    }

    toast.success(t('jsonPreview.applied'));
    return true;
  };

  const handleProfileChange = (profile: ScanProfile, defaultCredits: number) => {
    setValue('profile', profile);
    setValue('creditBudget', Math.min(defaultCredits, remainingCredits || 1, maxCreditBudget));
    clearErrors('profile');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
    >
      <form
        id="scan-form"
        onSubmit={(event) => {
          // Block native/implicit submits (Enter in inputs, accidental button defaults).
          // Scans start only via the explicit Start button handler.
          event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          const tag = (event.target as HTMLElement)?.tagName;
          if (tag === 'TEXTAREA') return;
          event.preventDefault();
        }}
        className="lg:col-span-8 space-y-8"
      >
        <Card>
          <CardHeader
            icon={Globe}
            title={t('sections.general.title')}
            description={t('sections.general.desc')}
          />
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label required>{t('fields.name.label')}</Label>
              <Input {...register('name')} placeholder={t('fields.name.placeholder')} />
              {errors.name && (
                <p className="text-status-danger text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.name.message}
                </p>
              )}
            </div>

            <ProfileSelector
              value={selectedProfile}
              onChange={handleProfileChange}
              profiles={toolConfigSchema?.profiles}
              planName={planName}
              error={errors.profile?.message}
            />

            <div className="space-y-1.5">
              <TargetPicker
                targets={targetsData?.items ?? []}
                loading={targetsLoading}
                value={manualTargetUrl}
                selectedId={formValues.targetId || ''}
                onChange={({ url, targetId }) => {
                  setManualTargetUrl(url);
                  setValue('targets', url.trim());
                  setValue('targetId', targetId);
                  clearErrors('targets');
                }}
                label={t('fields.target.label')}
                required
                placeholder={t('fields.target.placeholder')}
                loadingLabel={t('fields.target.loading')}
                emptyLabel={t('fields.target.empty')}
                noMatchesLabel={t('fields.target.noMatches')}
                hint={t('fields.target.hint')}
              />
              <input type="hidden" {...register('targetId')} />
            </div>

            {selectedExistingTarget?.browserAuthConfigured && (
              <p className="flex items-center gap-2 text-xs text-text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
                {tTargetAuth('alreadyConfigured')}
              </p>
            )}

            {canConfigureBrowserAuth && (
              !showBrowserAuth ? (
                <button
                  type="button"
                  onClick={() => setShowBrowserAuth(true)}
                  className="flex items-center gap-2 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {tTargetAuth('toggleLabel')}
                </button>
              ) : (
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white/8 p-2 text-cyan-300 shadow-sm">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="w-full space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{tTargetAuth('cardTitle')}</p>
                        <p className="mt-1 text-sm text-text-muted">{tTargetAuth('hint')}</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={loginUrlId}>{tTargetAuth('loginUrl')}</Label>
                          <Input
                            id={loginUrlId}
                            type="url"
                            value={browserAuth.loginUrl ?? ''}
                            onChange={(event) => setBrowserAuth((current) => ({ ...current, loginUrl: event.target.value }))}
                            placeholder={manualTargetUrl || t('fields.target.placeholder')}
                          />
                          <p className="mt-1 text-[11px] text-text-muted">{tTargetAuth('loginUrlAutoDetectHint')}</p>
                        </div>
                        <div>
                          <Label htmlFor={targetUrlOverrideId}>{tTargetAuth('targetUrl')}</Label>
                          <Input
                            id={targetUrlOverrideId}
                            type="url"
                            value={browserAuth.targetUrl ?? ''}
                            onChange={(event) => setBrowserAuth((current) => ({ ...current, targetUrl: event.target.value }))}
                            placeholder={manualTargetUrl || t('fields.target.placeholder')}
                          />
                        </div>
                        <div>
                          <Label htmlFor={usernameId} required>{tTargetAuth('username')}</Label>
                          <Input
                            id={usernameId}
                            value={browserAuth.username ?? ''}
                            onChange={(event) => setBrowserAuth((current) => ({ ...current, username: event.target.value }))}
                            autoComplete="username"
                            placeholder={tTargetAuth('usernamePlaceholder')}
                          />
                        </div>
                        <div>
                          <Label htmlFor={passwordId} required>{tTargetAuth('password')}</Label>
                          <div className="relative">
                            <Input
                              id={passwordId}
                              type={showPassword ? 'text' : 'password'}
                              value={browserAuth.password ?? ''}
                              onChange={(event) => setBrowserAuth((current) => ({ ...current, password: event.target.value }))}
                              autoComplete="new-password"
                              placeholder={tTargetAuth('passwordPlaceholder')}
                              className="pr-11"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((current) => !current)}
                              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-muted transition hover:text-text-secondary"
                              aria-label={showPassword ? tTargetAuth('hidePassword') : tTargetAuth('showPassword')}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <label htmlFor={mfaId} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <Checkbox
                          id={mfaId}
                          checked={browserAuth.mfa}
                          onChange={(event) => setBrowserAuth((current) => ({ ...current, mfa: event.target.checked }))}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{tTargetAuth('mfa')}</p>
                          <p className="mt-1 text-sm text-text-muted">{tTargetAuth('mfaDescription')}</p>
                        </div>
                      </label>

                      {browserAuthError ? <p className="text-sm text-status-danger">{browserAuthError}</p> : null}
                    </div>
                  </div>
                </div>
              )
            )}

            <CreditBudgetSelector
              value={creditBudget}
              onChange={(value) => setValue('creditBudget', value)}
              remainingCredits={remainingCredits}
              maxRuntimeMinutes={creditMinutesPerUnit}
              maxBudget={maxCreditBudget}
              error={errors.creditBudget?.message}
            />

            <div className="space-y-1.5">
              <Label>{t('fields.scopeSigned.label')}</Label>
              <label className="flex items-center space-x-3 rtl:space-x-reverse h-11 rounded-lg border border-cyan-400/18 bg-white/5 px-3">
                <Checkbox {...register('scopeSigned')} />
                <span className="text-sm text-text-secondary">{t('fields.scopeSigned.hint')}</span>
              </label>
            </div>

            {maxConcurrentScans > 0 && (
              <Alert variant={isConcurrencyBlocked ? 'warning' : 'info'} title={t('concurrent.title')}>
                <p className="text-xs">
                  {isConcurrencyBlocked
                    ? t('concurrent.blocked', { active: activeScanCount, max: maxConcurrentScans })
                    : t('concurrent.available', { active: activeScanCount, max: maxConcurrentScans })}
                </p>
              </Alert>
            )}

            {hasNoCreditsRemaining && (
              <Alert variant="error" title={t('summary.creditsError')}>
                <p className="text-xs">{t('summary.creditsDesc')}</p>
              </Alert>
            )}

            <input type="hidden" {...register('targets')} />
            {errors.targets && (
              <p className="text-status-danger text-xs flex items-center gap-1">
                <AlertCircle size={12} /> {errors.targets.message}
              </p>
            )}

            <div className="space-y-1.5">
              <Label>{t('fields.notes.label')}</Label>
              <Textarea {...register('notes')} placeholder={t('fields.notes.placeholder')} rows={2} />
            </div>

            {submissionError && !submissionSuccess && (
              <Alert variant="error" title={t('messages.error')}>
                <p className="text-xs">{submissionError}</p>
              </Alert>
            )}
          </CardContent>
        </Card>
      </form>

      <div className="lg:col-span-4 lg:sticky lg:top-24">
        <Card className="border-cyan-400/18">
          <CardContent className="pt-6">
            <ScanSummary
              values={formValues}
              isSubmitting={isSubmitting}
              remainingCredits={remainingCredits}
              creditBudget={creditBudget}
              maxRuntimeMinutes={creditMinutesPerUnit}
              isSubmitDisabled={hasNoCreditsRemaining || isConcurrencyBlocked}
              disableReason={
                isConcurrencyBlocked
                  ? t('concurrent.blocked', { active: activeScanCount, max: maxConcurrentScans })
                  : undefined
              }
              onStartScan={() => void handleSubmit(onSubmit)()}
              onPreviewJson={() => setShowJsonPreview(true)}
            />
          </CardContent>
        </Card>
      </div>

      <JsonPreviewDialog
        isOpen={showJsonPreview}
        onClose={() => setShowJsonPreview(false)}
        payload={currentPayload}
        onApply={handleApplyJsonPayload}
      />
    </motion.div>
  );
}
