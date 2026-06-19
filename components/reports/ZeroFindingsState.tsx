'use client';

import { CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ZeroFindingsState() {
  const t = useTranslations('landing.scans.reportPage.zeroFindings');

  return (
    <div className="rounded-2xl border border-status-success/28 bg-status-success/10 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-6 w-6 shrink-0 text-status-success" />
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
            <p className="mt-2 text-sm leading-7 text-text-secondary">{t('body')}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{t('nextStepsTitle')}</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
              <li>{t('steps.rescan')}</li>
              <li>{t('steps.manual')}</li>
              <li>{t('steps.auth')}</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
