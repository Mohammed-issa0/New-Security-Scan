'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { scansService } from '@/lib/scans/scansService';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Scan } from '@/lib/api/types';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';

const StatusBadge = ({ status }: { status: Scan['status'] }) => {
  const styles = {
    Pending: 'border border-status-warning/30 bg-status-warning/14 text-status-warning',
    Running: 'animate-pulse border border-cyan-300/28 bg-cyan-400/14 text-cyan-200',
    Completed: 'border border-status-success/30 bg-status-success/14 text-status-success',
    Failed: 'border border-status-danger/30 bg-status-danger/14 text-status-danger',
    Canceled: 'border border-white/14 bg-white/8 text-text-secondary',
  };

  return (
    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${styles[status]}`}>
      {status}
    </span>
  );
};

export default function ScansPage() {
  const t = useTranslations('landing.scans');
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'All' | Scan['status']>('All');
  const [toolFilter, setToolFilter] = useState<'All' | 'zap' | 'ffuf' | 'nmap' | 'wpscan' | 'sqlmap'>('All');

  useEffect(() => {
    setPage(1);
  }, [statusFilter, toolFilter]);

  const tCommon = useTranslations('common.states');
  const tButtons = useTranslations('common.buttons');

  const { data: scansData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['scans', page, statusFilter, toolFilter],
    queryFn: () =>
      scansService.getScans(page, 10, {
        status: statusFilter === 'All' ? undefined : statusFilter,
        tool: toolFilter === 'All' ? undefined : toolFilter,
      }),
    refetchInterval: (query) => {
      // Poll if any scan is Running or Pending
      const hasActiveScans = query.state.data?.items.some(
        (scan) => scan.status === 'Running' || scan.status === 'Pending'
      );
      return hasActiveScans ? 5000 : false;
    },
  });

  const totalPages = scansData?.totalPages ?? (scansData ? Math.max(1, Math.ceil(scansData.totalCount / scansData.pageSize)) : 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
          <p className="text-text-secondary">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/scans/new`}
          className="inline-flex items-center rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:shadow-[0_0_26px_rgba(0,209,255,0.24)] focus:outline-none focus:ring-2 focus:ring-cyan-300/55 focus:ring-offset-2 focus:ring-offset-cyber-bg"
        >
          {tButtons('startNow')}
        </Link>
      </div>

      <div className="app-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="text-sm text-text-secondary">{t('filters.label')}</div>
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Pending', 'Running', 'Completed', 'Failed', 'Canceled'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'border-cyan-300/40 bg-cyan-400/16 text-cyan-200'
                    : 'border-white/14 bg-white/5 text-text-secondary hover:border-cyan-300/30 hover:text-text-primary'
                }`}
              >
                {status === 'All' ? t('filters.all') : t(`details.status.${status.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-text-secondary">{t('filters.toolLabel')}</div>
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'zap', 'ffuf', 'nmap', 'wpscan', 'sqlmap'] as const).map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => setToolFilter(tool)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase transition ${
                  toolFilter === tool
                    ? 'border-cyan-300/40 bg-cyan-400/16 text-cyan-200'
                    : 'border-white/14 bg-white/5 text-text-secondary hover:border-cyan-300/30 hover:text-text-primary'
                }`}
              >
                {tool === 'All' ? t('filters.allTools') : tool}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="app-panel overflow-hidden shadow sm:rounded-lg">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/6">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                {t('requested')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                {t('started')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                {t('finished')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-transparent">
            {isLoading ? (
              <TableSkeletonRows columns={5} />
            ) : isError ? (
              <TableErrorRow
                columns={5}
                title={tCommon('error')}
                description={error instanceof Error ? error.message : undefined}
                retryLabel={tCommon('retry')}
                onRetry={() => refetch()}
              />
            ) : (scansData?.items?.length ?? 0) === 0 ? (
              <TableEmptyRow columns={5} title={t('noScans')} />
            ) : (
              (scansData?.items ?? []).map((scan) => (
                <tr key={scan.id} className="hover:bg-white/6">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={scan.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {new Date(scan.requestedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {scan.finishedAt ? new Date(scan.finishedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/${locale}/scans/${scan.id}`}
                      className="flex items-center justify-end text-cyan-300 hover:text-cyan-200"
                    >
                      <Eye className="h-5 w-5 mr-1" />
                      {t('view')}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {scansData && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 bg-transparent px-4 py-3 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-md border border-white/14 bg-white/5 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('previous')}
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-white/14 bg-white/5 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <p className="text-sm text-text-secondary">
                {t('page')} <span className="font-medium">{page}</span> {t('of')} <span className="font-medium">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-white/14 bg-white/5 px-3 py-2 text-sm text-text-secondary hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('previous')}
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-white/14 bg-white/5 px-3 py-2 text-sm text-text-secondary hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

