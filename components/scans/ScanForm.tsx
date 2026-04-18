'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { scanFormSchema, ScanFormSchemaType } from '@/lib/scans/schema';
import { buildPayload } from '@/lib/scans/mappers';
import { startScanWithAdapter } from '@/lib/scans/adapter';
import { ScanFormValues } from '@/lib/scans/types';
import type { AiScanConfigurationResponse } from '@/lib/api/types';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Globe, 
  Cpu, 
  ChevronDown, 
  AlertCircle, 
  AlertTriangle,
  Terminal,
  Zap,
  Fingerprint,
  Sparkles,
  Wand2,
  Bot
} from 'lucide-react';

import { 
  Button, 
  Card, 
  CardHeader, 
  CardContent, 
  Input, 
  Label, 
  Textarea, 
  Select, 
  Checkbox, 
  Alert
} from './ui';
import { KeyValueEditor } from './KeyValueEditor';
import { ScanSummary } from './ScanSummary';
import { JsonPreviewDialog } from './JsonPreviewDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { scansService } from '@/lib/scans/scansService';
import { plansService } from '@/lib/plans/plansService';
import { ApiRequestError } from '@/lib/api/client';

const TOOL_OPTIONS = [
  { value: 'ffuf', label: 'ffuf - Fuzzing Utility' },
  { value: 'nmap', label: 'nmap - Network Mapper' },
  { value: 'zap', label: 'zap - OWASP ZAP' },
  { value: 'wpscan', label: 'wpscan - WordPress Security' },
  { value: 'sqlmap', label: 'sqlmap - SQL Injection' },
  { value: 'xss', label: 'xss - Cross-Site Scripting' },
  { value: 'ssl', label: 'ssl - TLS / Certificate Checks' },
] as const;

const TARGET_TYPE_OPTIONS = [
  { value: 'webapp', labelKey: 'fields.ai.targetType.options.web' },
  { value: 'api', labelKey: 'fields.ai.targetType.options.api' },
  { value: 'network', labelKey: 'fields.ai.targetType.options.network' },
] as const;

const prettyJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const extractRecommendedTools = (response: AiScanConfigurationResponse | null): string[] => {
  if (!response) {
    return [];
  }

  const directList = [response.recommendedTools, response.recommendedTool]
    .flat()
    .filter((tool): tool is string => typeof tool === 'string' && tool.trim().length > 0)
    .map((tool) => tool.toLowerCase());

  const raw = response.raw as Record<string, unknown> | undefined;
  const nestedCandidates = [
    response.recommendedToolNames,
    raw?.recommendedTools,
    raw?.recommended_tools,
    raw?.tools,
    (raw?.recommendations as Record<string, unknown> | undefined)?.tools,
  ]
    .flat()
    .filter(Array.isArray)
    .flat()
    .filter((tool): tool is string => typeof tool === 'string' && tool.trim().length > 0)
    .map((tool) => tool.toLowerCase());

  return Array.from(new Set([...directList, ...nestedCandidates]));
};

export default function ScanForm() {
  const t = useTranslations('scanForm');
  const locale = useLocale();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credits] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [aiPlanId, setAiPlanId] = useState('');
  const [aiUserPrompt, setAiUserPrompt] = useState('');
  const [aiTargetUrl, setAiTargetUrl] = useState('');
  const [aiTargetType, setAiTargetType] = useState<(typeof TARGET_TYPE_OPTIONS)[number]['value']>('webapp');
  const [aiTimeBudget, setAiTimeBudget] = useState<number>(60);
  const [aiAssistantResponse, setAiAssistantResponse] = useState<AiScanConfigurationResponse | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ScanFormSchemaType>({
    resolver: zodResolver(scanFormSchema),
    mode: 'onChange',
    defaultValues: {
      targetId: '',
      tool: 'nmap',
      tool_depth: 'light',
      scopeSigned: true,
      timeoutMinutes: undefined,
      target_config: {
        headers: [],
        authentication: {
          cookies: [],
        },
      },
      has_captcha: false,
    },
  });

  const formValues = watch();
  const selectedTool = watch('tool');
  const hasCaptcha = watch('has_captcha');
  const selectedTargetId = watch('targetId');

  const { data: targetsData, isLoading: targetsLoading } = useQuery({
    queryKey: ['scan-form-targets'],
    queryFn: () => scansService.getTargets(1, 100),
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans-public'],
    queryFn: () => plansService.listPublic(),
  });

  const { data: activePlan } = useQuery({
    queryKey: ['plans-active'],
    queryFn: () => plansService.getActivePlan(),
  });

  const planName = activePlan?.planName?.trim().toLowerCase();
  const currentPlan = useMemo(
    () => plansData?.find((plan) => plan.planName?.trim().toLowerCase() === planName),
    [planName, plansData]
  );

  const planRestrictions = currentPlan?.restrictions;
  const isAuthScanningAllowed = planRestrictions?.allow_auth_scanning !== false;
  const isBruteforceAllowed = planRestrictions?.allow_bruteforce !== false;

  const allowedTools = useMemo(() => {
    const enabled = currentPlan?.enabledTools;
    const allowed = currentPlan?.allowed_tools;
    const source = enabled && enabled.length > 0 ? enabled : allowed;
    if (!source || source.length === 0) {
      return null;
    }
    return source.map((tool) => tool.toLowerCase());
  }, [currentPlan]);

  const planMaxRuntimeMinutes = currentPlan?.maxRuntimeMinutes ?? currentPlan?.max_runtime_minutes;
  const allowedToolSet = useMemo(() => {
    const set = new Set<string>(allowedTools ?? TOOL_OPTIONS.map((tool) => tool.value));
    if (!isBruteforceAllowed) {
      set.delete('ffuf');
    }
    return set;
  }, [allowedTools, isBruteforceAllowed]);

  const selectableTools = TOOL_OPTIONS.filter((tool) => allowedToolSet.has(tool.value));

  const aiRecommendedTools = useMemo(
    () => extractRecommendedTools(aiAssistantResponse),
    [aiAssistantResponse]
  );

  const aiRawResponse = useMemo(
    () => (aiAssistantResponse ? prettyJson(aiAssistantResponse.raw ?? aiAssistantResponse) : ''),
    [aiAssistantResponse]
  );

  const aiSuggestMutation = useMutation({
    mutationFn: async () => {
      if (!aiPlanId.trim() || !aiUserPrompt.trim() || !aiTargetUrl.trim() || !aiTimeBudget) {
        throw new Error(t('messages.ai.missingFields'));
      }

      const normalizedPlanName = activePlan?.planName?.trim().toLowerCase() || '';
      const rawPlanId = aiPlanId.trim();
      const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawPlanId);
      const normalizedPlanId = isUuidLike && normalizedPlanName ? normalizedPlanName : rawPlanId;
      const requestScanId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : null;

      return scansService.suggestScanConfiguration({
        scanId: requestScanId,
        planId: normalizedPlanId,
        userPrompt: aiUserPrompt.trim(),
        targetUrl: aiTargetUrl.trim(),
        targetType: aiTargetType,
        timeBudget: String(aiTimeBudget),
      });
    },
    onSuccess: (response) => {
      setAiAssistantResponse(response);
      toast.success(t('messages.ai.success'));
    },
    onError: (error: any) => {
      if (error instanceof ApiRequestError) {
        const backendMessage = (error.data?.error || '').toLowerCase();
        const isAiDisabled =
          error.status === 501 ||
          (error.status === 404 && (
            backendMessage.includes('ai') ||
            backendMessage.includes('not enabled') ||
            backendMessage.includes('disabled')
          ));

        if (isAiDisabled) {
          toast.error(t('messages.ai.notEnabled'));
          return;
        }
      }

      if (error instanceof ApiRequestError && error.status === 400 && error.data?.details) {
        const firstValidationMessage = Object.values(error.data.details)
          .flat()
          .find((value) => typeof value === 'string' && value.trim().length > 0);

        toast.error(firstValidationMessage || error.data.error || t('messages.ai.error'));
        return;
      }

      if (error instanceof ApiRequestError && (error.status === 502 || error.status === 503 || error.status === 504)) {
        toast.error(t('messages.ai.gatewayError'));
        return;
      }

      toast.error(error?.message || t('messages.ai.error'));
    },
  });

  const applyAiToForm = () => {
    if (!aiAssistantResponse) {
      toast.error(t('messages.ai.noResponse'));
      return;
    }

    const suggestedTool = aiRecommendedTools.find((tool) => allowedToolSet.has(tool));
    if (suggestedTool) {
      setValue('tool', suggestedTool as ScanFormSchemaType['tool']);
    }

    const timeoutFromAi = Number(aiAssistantResponse.timeoutMinutes ?? aiTimeBudget);
    if (Number.isFinite(timeoutFromAi) && timeoutFromAi > 0) {
      setValue('timeoutMinutes', timeoutFromAi);
    }

    if (typeof aiAssistantResponse.notes === 'string' && aiAssistantResponse.notes.trim().length > 0) {
      setValue('notes', aiAssistantResponse.notes.trim());
    }

    const matchedTarget = targetsData?.items?.find((target) => target.url === aiTargetUrl.trim());
    if (matchedTarget) {
      setValue('targetId', matchedTarget.id);
      setValue('targets', matchedTarget.url);
    }

    toast.success(t('messages.ai.applied'));
  };

  useEffect(() => {
    if (selectedTool === 'zap') {
      setValue('zap_config', { 'scan-type': 'baseline', ajax: false });
      setValue('ffuf_config', undefined);
    } else if (selectedTool === 'ffuf') {
      setValue('ffuf_config', { wordlist: 'common.txt', recursion: false, mc: '200', fc: '404' });
      setValue('zap_config', undefined);
    } else {
      setValue('zap_config', undefined);
      setValue('ffuf_config', undefined);
    }
  }, [selectedTool, setValue]);

  useEffect(() => {
    if (!allowedToolSet.has(selectedTool)) {
      const fallbackTool = selectableTools[0]?.value ?? 'nmap';
      setValue('tool', fallbackTool as ScanFormSchemaType['tool']);
    }
  }, [allowedToolSet, selectableTools, selectedTool, setValue]);

  useEffect(() => {
    if (!isAuthScanningAllowed) {
      setValue('target_config.authentication.token', '');
      setValue('target_config.authentication.cookies', []);
    }
  }, [isAuthScanningAllowed, setValue]);

  useEffect(() => {
    if (!selectedTargetId || !targetsData?.items) {
      return;
    }

    const selectedTarget = targetsData.items.find((target) => target.id === selectedTargetId);
    if (selectedTarget?.url) {
      setValue('targets', selectedTarget.url);
    }
  }, [selectedTargetId, setValue, targetsData]);

  useEffect(() => {
    if (activePlan?.planName) {
      setAiPlanId(activePlan.planName);
      return;
    }

    if (activePlan?.userPlanId) {
      setAiPlanId(activePlan.userPlanId);
    }
  }, [activePlan?.planName, activePlan?.userPlanId]);

  const onSubmit = async (data: ScanFormSchemaType) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    if (!allowedToolSet.has(data.tool)) {
      const message = t('messages.toolNotAllowed');
      setError('tool', { message });
      setSubmissionError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    if (!isAuthScanningAllowed) {
      const hasAuthConfig =
        !!data.target_config?.authentication?.token ||
        (data.target_config?.authentication?.cookies?.length ?? 0) > 0;
      if (hasAuthConfig) {
        const message = t('messages.authNotAllowed');
        setError('target_config.authentication.token', { message });
        setSubmissionError(message);
        toast.error(message);
        setIsSubmitting(false);
        return;
      }
    }

    if (planMaxRuntimeMinutes && data.timeoutMinutes && data.timeoutMinutes > planMaxRuntimeMinutes) {
      const message = t('messages.timeoutExceedsPlan', { max: planMaxRuntimeMinutes });
      setError('timeoutMinutes', { message });
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
      if (createdScan?.id) {
        router.push(`/${locale}/scans/${createdScan.id}`);
      } else {
        router.push(`/${locale}/scans`);
      }
    } catch (error: any) {
      const backendMessage = error?.data?.message || error?.message || t('messages.error');

      if (typeof backendMessage === 'string' && backendMessage.toLowerCase().includes('url')) {
        setError('targets', { message: backendMessage });
      }

      setSubmissionError(backendMessage);
      toast.error(backendMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPayload = buildPayload(formValues as ScanFormValues);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
    >
      <form id="scan-form" onSubmit={handleSubmit(onSubmit)} className="lg:col-span-8 space-y-8">

        <Card className="border-cyan-400/18 bg-cyan-400/5">
          <CardHeader
            icon={Bot}
            title={t('sections.aiAssistant.title')}
            description={t('sections.aiAssistant.desc')}
          />
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label required>{t('fields.ai.planId.label')}</Label>
                <Input
                  value={aiPlanId}
                  onChange={(event) => setAiPlanId(event.target.value)}
                  placeholder={t('fields.ai.planId.placeholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label required>{t('fields.ai.targetType.label')}</Label>
                <Select
                  value={aiTargetType}
                  onChange={(event) => setAiTargetType(event.target.value as (typeof TARGET_TYPE_OPTIONS)[number]['value'])}
                >
                  {TARGET_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{t(item.labelKey)}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label required>{t('fields.ai.targetUrl.label')}</Label>
                <Input
                  value={aiTargetUrl}
                  onChange={(event) => setAiTargetUrl(event.target.value)}
                  placeholder={t('fields.ai.targetUrl.placeholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label required>{t('fields.ai.timeBudget.label')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={aiTimeBudget}
                  onChange={(event) => setAiTimeBudget(Number(event.target.value || 0))}
                  placeholder={t('fields.ai.timeBudget.placeholder')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label required>{t('fields.ai.userPrompt.label')}</Label>
              <Textarea
                value={aiUserPrompt}
                onChange={(event) => setAiUserPrompt(event.target.value)}
                rows={4}
                placeholder={t('fields.ai.userPrompt.placeholder')}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => aiSuggestMutation.mutate()}
                disabled={aiSuggestMutation.isPending}
                className="inline-flex items-center gap-2"
              >
                <Sparkles size={16} />
                {aiSuggestMutation.isPending ? t('actions.ai.generating') : t('actions.ai.generate')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={applyAiToForm}
                disabled={!aiAssistantResponse}
                className="inline-flex items-center gap-2"
              >
                <Wand2 size={16} />
                {t('actions.ai.apply')}
              </Button>
            </div>

            {aiRecommendedTools.length > 0 && (
              <Alert variant="info" title={t('sections.aiAssistant.recommendedToolsTitle')}>
                <p className="text-xs">{aiRecommendedTools.join(', ')}</p>
              </Alert>
            )}

            {aiRawResponse && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('sections.aiAssistant.rawResponse')}</Label>
                </div>
                <pre className="max-h-72 overflow-auto rounded-lg border border-cyan-400/20 bg-cyber-bg/80 p-3 text-xs text-text-secondary">{aiRawResponse}</pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 1) General Scan Configuration */}
        <Card>
          <CardHeader 
            icon={Globe} 
            title={t('sections.general.title')} 
            description={t('sections.general.desc')}
          />
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label required>{t('fields.name.label')}</Label>
                <Input 
                  {...register('name')} 
                  placeholder={t('fields.name.placeholder')} 
                />
                {errors.name && <p className="text-status-danger text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.name.message}</p>}
                <p className="text-[11px] text-text-muted">{t('fields.name.hint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label required>{t('fields.tool.label')}</Label>
                <Select {...register('tool')}>
                  {TOOL_OPTIONS.map((tool) => {
                    const disabled = !allowedToolSet.has(tool.value);
                    return (
                      <option key={tool.value} value={tool.value} disabled={disabled}>
                        {tool.label}{disabled ? ` (${t('fields.tool.notAllowedSuffix')})` : ''}
                      </option>
                    );
                  })}
                </Select>
                {errors.tool && <p className="text-status-danger text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.tool.message}</p>}
                {allowedTools && (
                  <p className="text-[11px] text-text-muted">{t('fields.tool.allowedHint', { tools: selectableTools.map((tool) => tool.value).join(', ') })}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>{t('fields.toolDepth.label')}</Label>
                <Select {...register('tool_depth')}>
                  <option value="light">{t('fields.toolDepth.options.light')}</option>
                  <option value="deep">{t('fields.toolDepth.options.deep')}</option>
                  <option value="aggressive">{t('fields.toolDepth.options.aggressive')}</option>
                </Select>
                <p className="text-[11px] text-text-muted">{t('fields.toolDepth.hint')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label required>{t('fields.target.label')}</Label>
                <Select {...register('targetId')} disabled={targetsLoading || !targetsData?.items?.length}>
                  <option value="">{targetsLoading ? t('fields.target.loading') : t('fields.target.placeholder')}</option>
                  {targetsData?.items?.map((target) => (
                    <option key={target.id} value={target.id}>{target.url}</option>
                  ))}
                </Select>
                {errors.targetId && <p className="text-status-danger text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.targetId.message}</p>}
                <p className="text-[11px] text-text-muted">{t('fields.target.hint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('fields.scopeSigned.label')}</Label>
                <label className="flex items-center space-x-3 rtl:space-x-reverse h-11 rounded-lg border border-cyan-400/18 bg-white/5 px-3">
                  <Checkbox {...register('scopeSigned')} />
                  <span className="text-sm text-text-secondary">{t('fields.scopeSigned.hint')}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label>{t('fields.timeoutMinutes.label')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={planMaxRuntimeMinutes ?? 43200}
                  {...register('timeoutMinutes')}
                  placeholder={t('fields.timeoutMinutes.placeholder')}
                />
                {errors.timeoutMinutes && <p className="text-status-danger text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.timeoutMinutes.message}</p>}
                <p className="text-[11px] text-text-muted">
                  {planMaxRuntimeMinutes
                    ? t('fields.timeoutMinutes.planHint', { max: planMaxRuntimeMinutes })
                    : t('fields.timeoutMinutes.hint')}
                </p>
              </div>
            </div>

            {(allowedTools || planMaxRuntimeMinutes || planRestrictions) && (
              <Alert variant="info" title={t('sections.general.restrictionsTitle')}>
                <div className="space-y-1 text-xs">
                  {allowedTools && (
                    <p>{t('sections.general.restrictions.tools', { tools: selectableTools.map((tool) => tool.value).join(', ') })}</p>
                  )}
                  {planMaxRuntimeMinutes && (
                    <p>{t('sections.general.restrictions.runtime', { max: planMaxRuntimeMinutes })}</p>
                  )}
                  {planRestrictions && (
                    <p>
                      {t('sections.general.restrictions.auth', { state: isAuthScanningAllowed ? t('sections.general.restrictions.allowed') : t('sections.general.restrictions.blocked') })}
                      {' • '}
                      {t('sections.general.restrictions.bruteforce', { state: isBruteforceAllowed ? t('sections.general.restrictions.allowed') : t('sections.general.restrictions.blocked') })}
                    </p>
                  )}
                </div>
              </Alert>
            )}

            <div className="space-y-1.5">
              <input type="hidden" {...register('targets')} />
              {errors.targets && <p className="text-status-danger text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.targets.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>{t('fields.notes.label')}</Label>
              <Textarea 
                {...register('notes')} 
                placeholder={t('fields.notes.placeholder')} 
                rows={2} 
              />
            </div>
          </CardContent>
        </Card>

        {/* 2) Target Connection Settings */}
        <Card>
          <CardHeader 
            icon={Fingerprint} 
            title={t('sections.connection.title')} 
            description={t('sections.connection.desc')}
          />
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label>{t('fields.userAgent.label')}</Label>
                <Input {...register('target_config.user_agent')} placeholder={t('fields.userAgent.placeholder')} />
                <p className="text-[11px] text-text-muted">{t('fields.userAgent.hint')}</p>
              </div>
              {isAuthScanningAllowed ? (
                <div className="space-y-1.5">
                  <Label>{t('fields.authToken.label')}</Label>
                  <Input {...register('target_config.authentication.token')} placeholder={t('fields.authToken.placeholder')} />
                  <p className="text-[11px] text-text-muted">{t('fields.authToken.hint')}</p>
                </div>
              ) : (
                <Alert variant="warning" title={t('fields.authToken.blockedTitle')}>
                  <p className="text-xs">{t('fields.authToken.blockedHint')}</p>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8 pt-4 border-t border-white/10">
              <KeyValueEditor
                name="target_config.headers"
                title={t('fields.headers.title')}
                labelPlaceholder={t('fields.headers.placeholderKey')}
                valuePlaceholder={t('fields.headers.placeholderValue')}
                register={register}
                control={control}
                tooltip={t('fields.headers.tooltip')}
              />
              
              {isAuthScanningAllowed && (
                <KeyValueEditor
                  name="target_config.authentication.cookies"
                  title={t('fields.cookies.title')}
                  labelPlaceholder={t('fields.cookies.placeholderKey')}
                  valuePlaceholder={t('fields.cookies.placeholderValue')}
                  register={register}
                  control={control}
                  tooltip={t('fields.cookies.tooltip')}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3) Tool-Specific Configuration */}
        <Card className="border-cyan-400/18 bg-cyan-400/5">
          <CardHeader 
            icon={Cpu} 
            title={t('sections.toolConfig.title', { tool: selectedTool.toUpperCase() })}
            description={t('sections.toolConfig.desc', { tool: selectedTool })}
          />
          <CardContent>
            <AnimatePresence mode="popLayout">
              {selectedTool === 'zap' && (
                <motion.div 
                  key="zap"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label required>{t('fields.zap.scanType.label')}</Label>
                      <Select {...register('zap_config.scan-type' as any)}>
                        <option value="baseline">{t('fields.zap.scanType.baseline')}</option>
                        <option value="full">{t('fields.zap.scanType.full')}</option>
                        <option value="api">{t('fields.zap.scanType.api')}</option>
                      </Select>
                      {formValues.zap_config?.['scan-type'] === 'api' && (
                        <p className="text-[11px] text-cyan-300 font-medium mt-1">{t('fields.zap.scanType.apiHint')}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse pt-8">
                      <Checkbox id="ajax" {...register('zap_config.ajax' as any)} />
                      <div>
                        <Label className="mb-0" htmlFor="ajax">{t('fields.zap.ajax.label')}</Label>
                        <p className="text-[11px] text-text-muted">{t('fields.zap.ajax.hint')}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {selectedTool === 'ffuf' && (
                <motion.div 
                  key="ffuf"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label required>{t('fields.ffuf.wordlist.label')}</Label>
                      <Select {...register('ffuf_config.wordlist' as any)}>
                        <option value="common.txt">{t('fields.ffuf.wordlist.common')}</option>
                        <option value="big.txt">{t('fields.ffuf.wordlist.big')}</option>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse pt-8">
                      <Checkbox id="recursion" {...register('ffuf_config.recursion' as any)} />
                      <div>
                        <Label className="mb-0" htmlFor="recursion">{t('fields.ffuf.recursion.label')}</Label>
                        <p className="text-[11px] text-text-muted">{t('fields.ffuf.recursion.hint')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label>{t('fields.ffuf.mc.label')}</Label>
                      <Input {...register('ffuf_config.mc' as any)} placeholder={t('fields.ffuf.mc.placeholder')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('fields.ffuf.fc.label')}</Label>
                      <Input {...register('ffuf_config.fc' as any)} placeholder={t('fields.ffuf.fc.placeholder')} />
                    </div>
                  </div>
                  <Alert variant="info">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-cyan-300" />
                      <p className="text-xs">
                        {t('fields.ffuf.proTip')}
                      </p>
                    </div>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {(selectedTool === 'nmap' || selectedTool === 'wpscan' || selectedTool === 'sqlmap') && (
              <div className="text-center py-8">
                <p className="text-sm text-text-muted italic">No additional configuration for {selectedTool} is required at this stage.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4) Advanced Settings */}
        <div className="border border-white/12 rounded-2xl overflow-hidden transition-all duration-300">
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full flex items-center justify-between p-6 transition-colors ${showAdvanced ? 'bg-white/8' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 text-cyan-300 border border-cyan-400/20 rounded-lg"><Terminal size={18} /></div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-text-primary">{t('sections.advanced.title')}</h3>
                <p className="text-[11px] text-text-muted">{t('sections.advanced.desc')}</p>
              </div>
            </div>
            <ChevronDown size={20} className={`text-text-muted transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showAdvanced && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-white/10"
              >
                <CardContent className="bg-transparent space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t('fields.extraArgs.label')}</Label>
                    <Input {...register('extra_args')} placeholder={t('fields.extraArgs.placeholder')} />
                  </div>
                  <Alert variant="warning">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <p className="text-xs">
                        {t('sections.advanced.dangerZone')}
                      </p>
                    </div>
                  </Alert>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5) CAPTCHA Handling */}
        <Card className={`transition-colors duration-300 ${hasCaptcha ? 'border-status-warning/35 bg-status-warning/10' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Checkbox id="captcha" {...register('has_captcha')} />
              <div>
                <Label className="mb-0" htmlFor="captcha">{t('sections.captcha.title')}</Label>
                <p className="text-[11px] text-text-muted">{t('sections.captcha.desc')}</p>
              </div>
            </div>
            
            <AnimatePresence>
              {hasCaptcha && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <Alert variant="warning" title={t('sections.captcha.warning.title')}>
                    <p className="text-xs mb-2">{t('sections.captcha.warning.desc')}</p>
                    <p className="text-xs font-bold underline mb-1">{t('sections.captcha.warning.workaround')}</p>
                    <ul className="list-disc ml-4 rtl:ml-0 rtl:mr-4 text-xs space-y-1">
                      <li>{t('sections.captcha.warning.steps.0')}</li>
                      <li>{t('sections.captcha.warning.steps.1')}</li>
                      <li>{t('sections.captcha.warning.steps.2')}</li>
                    </ul>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </form>

      <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
        <Card className="border-cyan-400/28 shadow-[0_18px_50px_rgba(0,209,255,0.16)]">
          <CardContent className="p-6">
            <ScanSummary 
              values={formValues as ScanFormValues}
              isSubmitting={isSubmitting}
              credits={credits}
              onPreviewJson={() => setShowJsonPreview(true)}
            />
          </CardContent>
        </Card>

        {submissionSuccess && (
          <Alert variant="success" title={t('messages.success')} />
        )}

        {submissionError && (
          <Alert variant="error" title={t('messages.error')}>
            {submissionError}
          </Alert>
        )}
      </aside>

      <JsonPreviewDialog 
        isOpen={showJsonPreview} 
        onClose={() => setShowJsonPreview(false)} 
        payload={currentPayload} 
      />
    </motion.div>
  );
}
