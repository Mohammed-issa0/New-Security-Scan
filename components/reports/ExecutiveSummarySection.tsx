'use client';

import { useTranslations } from 'next-intl';
import type { JsonExecutiveSummary } from '@/lib/reports/jsonReportTypes';

interface ExecutiveSummarySectionProps {
  summary: JsonExecutiveSummary;
}

export function ExecutiveSummarySection({ summary }: ExecutiveSummarySectionProps) {
  const t = useTranslations('landing.scans.reportPage.executiveSummary');

  return (
    <div className="rounded-2xl border border-white/14 bg-white/6 p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">{t('title')}</h2>
        {summary.headline ? (
          <p className="mt-2 text-lg font-medium text-status-warning">{summary.headline}</p>
        ) : null}
        {summary.summary ? (
          <p className="mt-3 text-sm leading-7 text-text-secondary">{summary.summary}</p>
        ) : null}
      </div>

      {(summary.keyRisks?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t('keyRisks')}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
            {summary.keyRisks?.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      )}

      {(summary.recommendedNextSteps?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t('recommendedNextSteps')}</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
            {summary.recommendedNextSteps?.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
