'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { scansService } from '@/lib/scans/scansService';
import { plansService } from '@/lib/plans/plansService';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { ScanStatus } from '@/lib/api/types';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';
import { ScanCreditsDisplay } from '@/components/scans/ScanCreditsDisplay';
import { ScanQueueProgressCard } from '@/components/scans/ScanQueueProgressCard';
import { ScanProfileBadge } from '@/components/scans/ScanProfileBadge';
import { countActiveScans, getPlanMaxConcurrentScans } from '@/lib/scans/concurrency';
import { isActiveScanStatus, normalizeScanStatus } from '@/lib/scans/scanStatus';
import { usePageVisibility } from '@/lib/hooks/usePageVisibility';
import { scanHasQueueFields } from '@/lib/scans/useScanQueueEstimate';

const StatusBadge = ({ status }: { status: ScanStatus | 'Unknown' }) => {
  const t = useTranslations('landing.scans.details.status');
  const styles: Record<string, string> = {
    Pending: 'border border-status-warning/30 bg-status-warning/14 text-status-warning',
    Running: 'animate-pulse border border-cyan-300/28 bg-cyan-400/14 text-cyan-200',
    Completed: 'border border-status-success/30 bg-status-success/14 text-status-success',
    CompletedWithLimits: 'border border-status-warning/30 bg-status-warning/14 text-status-warning',
    Failed: 'border border-status-danger/30 bg-status-danger/14 text-status-danger',
    Canceled: 'border border-white/14 bg-white/8 text-text-secondary',
    Unknown: 'border border-white/14 bg-white/8 text-text-secondary',
  };

  const labelKey = status === 'Unknown' ? 'unknown' : status.toLowerCase();

  return (
    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${styles[status] || styles.Unknown}`}>
      {status === 'Unknown' ? status : t(labelKey as 'pending')}
    </span>
  );
};

export default function ScansPage() {
  const t = useTranslations('landing.scans');
  const locale = useLocale();
  const router = useRouter();
  const [page, setPage] = useState(1);

  const tCommon = useTranslations('common.states');
  const tButtons = useTranslations('common.buttons');

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
  const maxConcurrentScans = getPlanMaxConcurrentScans(currentPlan);
  const isPageVisible = usePageVisibility();

  const { data: scansData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['scans', page],
    queryFn: () => scansService.getScans(page, 10),
    refetchInterval: (query) => {
      if (!isPageVisible) {
        return false;
      }

      const activeScans = query.state.data?.items.filter((scan) =>
        isActiveScanStatus(normalizeScanStatus(scan.status))
      );

      if (!activeScans?.length) {
        return false;
      }

      const hasDeepQueue = activeScans.some(
        (scan) => (scan.queuePosition ?? 0) >= 4
      );

      return hasDeepQueue ? 30_000 : 15_000;
    },
  });

  const activeScanCount = useMemo(
    () => countActiveScans(scansData?.items ?? []),
    [scansData?.items]
  );

  const scans = scansData?.items ?? [];

  const totalPages = scansData?.totalPages ?? (scansData ? Math.max(1, Math.ceil(scansData.totalCount / scansData.pageSize)) : 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
          <p className="text-text-secondary">{t('subtitle')}</p>
          {maxConcurrentScans > 0 && (
            <p className="mt-1 text-xs text-text-muted">
              {t('concurrent.usage', { active: activeScanCount, max: maxConcurrentScans })}
            </p>
          )}
        </div>
        <Link
          href={`/${locale}/scans/new`}
          className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:shadow-[0_0_26px_rgba(0,209,255,0.24)] focus:outline-none focus:ring-2 focus:ring-cyan-300/55 focus:ring-offset-2 focus:ring-offset-cyber-bg sm:w-auto"
        >
          {tButtons('startNow')}
        </Link>
      </div>

      <div className="app-panel overflow-hidden shadow sm:rounded-lg">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/6">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                {t('profile.column')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                {t('credits.column')}
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
              <TableSkeletonRows columns={7} />
            ) : isError ? (
              <TableErrorRow
                columns={7}
                title={tCommon('error')}
                description={error instanceof Error ? error.message : undefined}
                retryLabel={tCommon('retry')}
                onRetry={() => refetch()}
              />
            ) : scans.length === 0 ? (
              <TableEmptyRow columns={7} title={t('noScans')} />
            ) : (
              scans.map((scan) => {
                const normalizedStatus = normalizeScanStatus(scan.status);
                const showConcurrentSlot =
                  maxConcurrentScans > 0 && isActiveScanStatus(normalizedStatus);

                return (
                  <tr
                    key={scan.id}
                    onClick={() => router.push(`/${locale}/scans/${scan.id}`)}
                    className="cursor-pointer hover:bg-white/6"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <StatusBadge status={normalizedStatus} />
                        {showConcurrentSlot && (
                          <p className="text-[10px] text-text-muted">
                            {t('concurrent.slot', { max: maxConcurrentScans })}
                          </p>
                        )}
                        {isActiveScanStatus(normalizedStatus) &&
                        (scanHasQueueFields(scan) || normalizedStatus === 'Pending' || normalizedStatus === 'Running') ? (
                          <ScanQueueProgressCard
                            variant="compact"
                            source={{
                              status: scan.status,
                              queuePosition: scan.queuePosition ?? (normalizedStatus === 'Running' ? 0 : null),
                              estimatedWaitSeconds: scan.estimatedWaitSeconds,
                              estimatedFinishAt: scan.estimatedFinishAt,
                              progressPercent: scan.progressPercent ?? (normalizedStatus === 'Pending' ? 0 : null),
                            }}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ScanProfileBadge profile={scan.profile} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ScanCreditsDisplay
                        status={normalizedStatus}
                        creditBudget={scan.creditBudget}
                        creditsConsumed={scan.creditsConsumed}
                        compact
                      />
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
                );
              })
            )}
          </tbody>
        </table>
        </div>

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
