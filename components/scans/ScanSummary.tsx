'use client';

import * as React from "react"
import { Shield, Target, Key, Settings2, Code, AlertTriangle } from "lucide-react"
import { ScanFormValues } from "@/lib/scans/types"
import { Button, Badge, Alert } from "./ui"
import { useTranslations, useLocale } from "next-intl"
import { motion } from "framer-motion"

interface ScanSummaryProps {
  values: ScanFormValues
  isSubmitting: boolean
  credits: number | null
  onPreviewJson: () => void
}

export function ScanSummary({ values, isSubmitting, credits, onPreviewJson }: ScanSummaryProps) {
  const t = useTranslations('scanForm.summary')
  const locale = useLocale()
  
  const targetCount = values.targets ? values.targets.split('\n').filter(t => t.trim()).length : 0
  const hasAuth = values.target_config.authentication.token || values.target_config.authentication.cookies.length > 0
  const isSharedMode = process.env.NEXT_PUBLIC_SCAN_SUBMIT_MODE === 'shared'

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{t('title')}</h3>
          <Badge variant={targetCount > 0 ? 'success' : 'outline'}>
            {t('targetsCount', { count: targetCount })}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <Shield size={18} className="text-blue-600" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('scanName')}</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {values.name || t('untitled')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <Target size={18} className="text-blue-600" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tool</p>
              <Badge className="mt-0.5 uppercase font-bold">{values.tool}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <Key size={18} className="text-blue-600" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('auth')}</p>
              <p className="text-xs font-medium text-gray-600">
                {hasAuth ? 'Enabled' : t('noAuth')}
              </p>
            </div>
          </div>

          {values.tool === 'zap' && values.zap_config && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
              <Settings2 size={18} className="text-blue-600" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{t('zapConfig')}</p>
                <p className="text-xs font-medium text-blue-700">
                  {values.zap_config['scan-type']} spider {values.zap_config.ajax ? '+ ajax' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {values.has_captcha && (
        <Alert variant="warning">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium leading-relaxed">
              {t('captchaWarning')}
            </p>
          </div>
        </Alert>
      )}

      {isSharedMode && credits === 0 && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={16} />
            <span className="text-sm font-bold">{t('creditsError')}</span>
          </div>
          <p className="text-xs text-red-600 leading-relaxed">
            {t('creditsDesc')}
          </p>
          <Button variant="danger" size="sm" className="w-full text-xs h-9">
            {t('upgrade')}
          </Button>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <Button 
          type="submit" 
          form="scan-form"
          className="w-full shadow-lg shadow-blue-500/20 py-6 h-auto text-lg"
          disabled={isSubmitting || (isSharedMode && credits === 0)}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <motion.svg 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="h-5 w-5 text-white" 
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </motion.svg>
              {t('starting')}
            </span>
          ) : t('startScan')}
        </Button>
        
        <Button 
          type="button"
          variant="ghost" 
          onClick={onPreviewJson}
          className="w-full gap-2 text-gray-500 hover:text-blue-600 h-10 text-xs font-bold"
        >
          <Code size={14} /> {t('previewJson')}
        </Button>
      </div>
    </div>
  )
}

