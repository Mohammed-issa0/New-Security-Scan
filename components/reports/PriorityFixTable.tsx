'use client';

import { useTranslations } from 'next-intl';
import type { JsonPriorityFixRow } from '@/lib/reports/jsonReportTypes';

interface PriorityFixTableProps {
  rows: JsonPriorityFixRow[];
}

export function PriorityFixTable({ rows }: PriorityFixTableProps) {
  const t = useTranslations('landing.scans.reportPage.priorityFix');

  if (!rows.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/14 bg-white/6 p-6 shadow-sm overflow-x-auto">
      <h2 className="text-xl font-semibold text-text-primary">{t('title')}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
      <table className="mt-5 min-w-full divide-y divide-white/10">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t('columns.priority')}</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t('columns.finding')}</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t('columns.severity')}</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t('columns.cvss')}</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{t('columns.endpoint')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row, index) => (
            <tr key={`${row.finding}-${index}`}>
              <td className="px-3 py-3 text-sm text-text-primary">{row.priority ?? index + 1}</td>
              <td className="px-3 py-3 text-sm text-text-primary">{row.finding ?? '-'}</td>
              <td className="px-3 py-3 text-sm text-text-secondary">{row.severity ?? '-'}</td>
              <td className="px-3 py-3 text-sm text-text-secondary">
                {typeof row.cvss === 'number' ? row.cvss.toFixed(1) : '-'}
              </td>
              <td className="px-3 py-3 text-sm text-text-secondary break-all">{row.endpoint ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
