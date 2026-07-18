'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileScanFormSchema, ProfileScanFormSchemaType } from '@/lib/scans/schema';
import { buildProfilePayload } from '@/lib/scans/mappers';
import { startScanWithAdapter } from '@/lib/scans/adapter';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Globe, AlertCircle } from 'lucide-react';
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
import type { ScanProfile } from '@/lib/api/types';

import { ensureTargetUrlScheme, isValidTargetUrl, normalizeTargetUrlForCompare } from '@/lib/targets/urlUtils';

export default function ScanForm() {
  const t = useTranslations('scanForm');
  const locale = useLocale();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [manualTargetUrl, setManualTargetUrl] = useState('');

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
      setValue('creditBudget', Math.min(schemaProfile.defaultCredits, remainingCredits || 1));
    }
  }, [selectedProfile, toolConfigSchema?.profiles, remainingCredits, setValue]);

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
          const backendMessage = err?.data?.message || err?.message || t('messages.error');
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
    try {
      return buildProfilePayload(formValues);
    } catch {
      return null;
    }
  })();

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
      <form id="scan-form" onSubmit={handleSubmit(onSubmit)} className="lg:col-span-8 space-y-8">
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
              onPreviewJson={() => setShowJsonPreview(true)}
            />
          </CardContent>
        </Card>
      </div>

      <JsonPreviewDialog
        isOpen={showJsonPreview}
        onClose={() => setShowJsonPreview(false)}
        payload={currentPayload}
      />
    </motion.div>
  );
}
