'use client';

import * as React from 'react';
import { Shield, Target, Clock, Coins } from 'lucide-react';
import type { ProfileScanFormSchemaType } from '@/lib/scans/schema';
import { Button, Badge, Alert } from './ui';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Code } from 'lucide-react';

interface ScanSummaryProps {
  values: ProfileScanFormSchemaType;
  isSubmitting: boolean;
  remainingCredits: number;
  creditBudget: number;
  maxRuntimeMinutes?: number;
  isSubmitDisabled?: boolean;
  disableReason?: string;
  onStartScan: () => void;
  onPreviewJson: () => void;
}

export function ScanSummary({
  values,
  isSubmitting,
  remainingCredits,
  creditBudget,
  maxRuntimeMinutes,
  isSubmitDisabled = false,
  disableReason,
  onStartScan,
  onPreviewJson,
}: ScanSummaryProps) {
  const t = useTranslations('scanForm.summary');
  const tCredit = useTranslations('scanForm.creditBudget');
  const tProfile = useTranslations('scanForm.fields.profile');

  const hasTarget = Boolean(values.targets?.trim() || values.targetId);
  const effectiveMaxRuntime = maxRuntimeMinutes ? maxRuntimeMinutes * creditBudget : null;
  const submitDisabled = isSubmitting || isSubmitDisabled || remainingCredits <= 0;
  const profileLabel = tProfile(`options.${values.profile}.title`);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-primary">{t('title')}</h3>
          <Badge variant={hasTarget ? 'success' : 'outline'}>
            {hasTarget ? t('targetReady') : t('targetMissing')}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/6 border border-cyan-400/14">
            <Shield size={18} className="text-cyan-300" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{t('scanName')}</p>
              <p className="text-sm font-semibold text-text-primary truncate">
                {values.name || t('untitled')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/6 border border-cyan-400/14">
            <Target size={18} className="text-cyan-300" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{tProfile('summaryLabel')}</p>
              <Badge className="mt-0.5 uppercase font-bold">{profileLabel}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/6 border border-cyan-400/14">
            <Coins size={18} className="text-cyan-300" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{tCredit('summaryLabel')}</p>
              <p className="text-sm font-semibold text-text-primary">
                {tCredit('summaryValue', { budget: creditBudget, remaining: remainingCredits })}
              </p>
            </div>
          </div>

          {effectiveMaxRuntime != null && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/6 border border-cyan-400/14">
              <Clock size={18} className="text-cyan-300" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{tCredit('maxRuntimeLabel')}</p>
                <p className="text-sm font-semibold text-text-primary">
                  {tCredit('maxRuntime', { minutes: effectiveMaxRuntime })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {remainingCredits <= 0 && (
        <div className="p-4 bg-status-danger/12 border border-status-danger/28 rounded-xl space-y-3">
          <p className="text-xs text-status-danger leading-relaxed">{t('creditsDesc')}</p>
          <Button variant="danger" size="sm" className="w-full text-xs h-9">
            {t('upgrade')}
          </Button>
        </div>
      )}

      {disableReason && (
        <Alert variant="warning">
          <p className="text-xs leading-relaxed">{disableReason}</p>
        </Alert>
      )}

      <div className="space-y-3 pt-2">
        <Button
          type="button"
          onClick={onStartScan}
          className="w-full shadow-lg shadow-cyan-400/20 py-6 h-auto text-lg"
          disabled={submitDisabled}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <motion.svg
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </motion.svg>
              {t('starting')}
            </span>
          ) : (
            t('startScan')
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onPreviewJson}
          className="w-full gap-2 text-text-muted hover:text-cyan-300 h-10 text-xs font-bold"
        >
          <Code size={14} /> {t('previewJson')}
        </Button>
      </div>
    </div>
  );
}
