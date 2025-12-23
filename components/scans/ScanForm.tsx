'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { scanFormSchema, ScanFormSchemaType } from '@/lib/scans/schema';
import { buildPayload } from '@/lib/scans/mappers';
import { submitScan, checkCredits } from '@/lib/scans/api';
import { ScanFormValues } from '@/lib/scans/types';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Globe, 
  Cpu, 
  ChevronDown, 
  AlertCircle, 
  AlertTriangle,
  Terminal,
  Zap,
  Fingerprint
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

export default function ScanForm() {
  const t = useTranslations('scanForm');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ScanFormSchemaType>({
    resolver: zodResolver(scanFormSchema),
    mode: 'onChange',
    defaultValues: {
      tool: 'nmap',
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
    const fetchCredits = async () => {
      const c = await checkCredits();
      setCredits(c);
    };
    fetchCredits();
  }, []);

  const onSubmit = async (data: ScanFormSchemaType) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    try {
      const currentCredits = await checkCredits();
      if (currentCredits === 0 && process.env.NEXT_PUBLIC_SCAN_SUBMIT_MODE === 'shared') {
        setSubmissionError(t('summary.creditsDesc'));
        setIsSubmitting(false);
        return;
      }

      const payload = buildPayload(data as ScanFormValues);
      await submitScan(payload);
      setSubmissionSuccess(true);
      reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      setSubmissionError(error.message || t('messages.error'));
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
                {errors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.name.message}</p>}
                <p className="text-[11px] text-gray-400">{t('fields.name.hint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label required>{t('fields.tool.label')}</Label>
                <Select {...register('tool')}>
                  <option value="ffuf">ffuf - Fuzzing Utility</option>
                  <option value="nmap">nmap - Network Mapper</option>
                  <option value="zap">zap - OWASP ZAP</option>
                  <option value="wpscan">wpscan - WordPress Security</option>
                  <option value="sqlmap">sqlmap - SQL Injection</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label required>{t('fields.targets.label')}</Label>
              <Textarea 
                {...register('targets')} 
                placeholder={t('fields.targets.placeholder')} 
                rows={4}
                className="font-mono text-sm"
              />
              {errors.targets && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.targets.message}</p>}
              <p className="text-[11px] text-gray-400">{t('fields.targets.hint')}</p>
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
                <p className="text-[11px] text-gray-400">{t('fields.userAgent.hint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t('fields.authToken.label')}</Label>
                <Input {...register('target_config.authentication.token')} placeholder={t('fields.authToken.placeholder')} />
                <p className="text-[11px] text-gray-400">{t('fields.authToken.hint')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 pt-4 border-t border-gray-50">
              <KeyValueEditor
                name="target_config.headers"
                title={t('fields.headers.title')}
                labelPlaceholder={t('fields.headers.placeholderKey')}
                valuePlaceholder={t('fields.headers.placeholderValue')}
                register={register}
                control={control}
                tooltip={t('fields.headers.tooltip')}
              />
              
              <KeyValueEditor
                name="target_config.authentication.cookies"
                title={t('fields.cookies.title')}
                labelPlaceholder={t('fields.cookies.placeholderKey')}
                valuePlaceholder={t('fields.cookies.placeholderValue')}
                register={register}
                control={control}
                tooltip={t('fields.cookies.tooltip')}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3) Tool-Specific Configuration */}
        <Card className="border-blue-100 bg-blue-50/10">
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
                        <p className="text-[11px] text-blue-600 font-medium mt-1">{t('fields.zap.scanType.apiHint')}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse pt-8">
                      <Checkbox id="ajax" {...register('zap_config.ajax' as any)} />
                      <div>
                        <Label className="mb-0" htmlFor="ajax">{t('fields.zap.ajax.label')}</Label>
                        <p className="text-[11px] text-gray-400">{t('fields.zap.ajax.hint')}</p>
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
                        <p className="text-[11px] text-gray-400">{t('fields.ffuf.recursion.hint')}</p>
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
                      <Zap size={16} className="text-blue-600" />
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
                <p className="text-sm text-gray-500 italic">No additional configuration for {selectedTool} is required at this stage.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4) Advanced Settings */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300">
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full flex items-center justify-between p-6 transition-colors ${showAdvanced ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Terminal size={18} /></div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-gray-900">{t('sections.advanced.title')}</h3>
                <p className="text-[11px] text-gray-500">{t('sections.advanced.desc')}</p>
              </div>
            </div>
            <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showAdvanced && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-gray-100"
              >
                <CardContent className="bg-white space-y-4">
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
        <Card className={`transition-colors duration-300 ${hasCaptcha ? 'border-orange-200 bg-orange-50/20' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Checkbox id="captcha" {...register('has_captcha')} />
              <div>
                <Label className="mb-0" htmlFor="captcha">{t('sections.captcha.title')}</Label>
                <p className="text-[11px] text-gray-500">{t('sections.captcha.desc')}</p>
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
        <Card className="border-blue-600 shadow-xl shadow-blue-500/10">
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
  <Alert variant="success" title="Scan submitted">
    Your scan has been submitted successfully.
  </Alert>
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


