'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { scansService } from '@/lib/scans/scansService';
import Link from 'next/link';
import { Eye, Clock, Shield, AlertCircle } from 'lucide-react';
import { Scan } from '@/lib/api/types';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';

const StatusBadge = ({ status }: { status: Scan['status'] }) => {
  const styles = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Running: 'bg-blue-100 text-blue-800 animate-pulse',
    Completed: 'bg-green-100 text-green-800',
    Failed: 'bg-red-100 text-red-800',
    Canceled: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>
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
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/scans/new`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {useTranslations('common.buttons')('startNow')}
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="text-sm text-gray-600">{t('filters.label')}</div>
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Pending', 'Running', 'Completed', 'Failed', 'Canceled'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {status === 'All' ? t('filters.all') : t(`details.status.${status.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-gray-600">{t('filters.toolLabel')}</div>
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'zap', 'ffuf', 'nmap', 'wpscan', 'sqlmap'] as const).map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => setToolFilter(tool)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase transition ${
                  toolFilter === tool
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {tool === 'All' ? t('filters.allTools') : tool}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('requested')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('started')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('finished')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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
              scansData.items.map((scan) => (
                <tr key={scan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={scan.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(scan.requestedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {scan.finishedAt ? new Date(scan.finishedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/${locale}/scans/${scan.id}`}
                      className="text-blue-600 hover:text-blue-900 flex items-center justify-end"
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
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('previous')}
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">
                {t('page')} <span className="font-medium">{page}</span> {t('of')} <span className="font-medium">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('previous')}
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

