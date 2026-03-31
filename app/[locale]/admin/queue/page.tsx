'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, Badge, Button } from '@/components/scans/ui';
import { ArrowDown, ArrowUp, RefreshCw, Server, Timer, Trash2, UsersRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { adminService } from '@/lib/admin/adminService';
import { toast } from 'sonner';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { useState } from 'react';
import type { QueueItem } from '@/lib/admin/types';

export default function AdminQueuePage() {
  const t = useTranslations('admin.queue');
  const tCommon = useTranslations('common.states');
  const tConfirm = useTranslations('common.confirmation');
  const queryClient = useQueryClient();
  const [jobToRemove, setJobToRemove] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-queue'],
    queryFn: () => adminService.queue.status(),
    refetchInterval: 5000,
  });

  const deleteMutation = useMutation({
    mutationFn: (vpsJobId: string) => adminService.queue.deleteJob(vpsJobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
      await refetch();
      toast.success(t('actions.deleteSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('actions.deleteError'));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ jobId, newPosition }: { jobId: string; newPosition: number }) =>
      adminService.queue.reorder(jobId, newPosition),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
      await refetch();
      toast.success(t('actions.reorderSuccess'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('actions.reorderError'));
    },
  });

  const jobs = data?.jobs ?? [];
  const summary = {
    queueSize: data?.queueSize ?? jobs.length,
    avgJobsAhead:
      jobs.length > 0 ? Math.round(jobs.reduce((sum, job) => sum + (job.jobsAheadCount || 0), 0) / jobs.length) : 0,
    nearestEta:
      jobs.length > 0
        ? jobs
            .map((job) => job.expectedFinishTimeSeconds || 0)
            .filter((seconds) => seconds > 0)
            .sort((a, b) => a - b)[0] || 0
        : 0,
  };

  const formatEta = (seconds: number) => {
    if (!seconds || seconds <= 0) {
      return '-';
    }
    if (seconds < 60) {
      return t('summary.seconds', { value: seconds });
    }
    const minutes = Math.ceil(seconds / 60);
    return t('summary.minutes', { value: minutes });
  };

  const queueSize = Math.max(summary.queueSize, jobs.length);
  const resolveQueueJobId = (job: QueueItem) => job.vpsJobId || job.scanToolId;
  const moveJob = (job: QueueItem, direction: 'up' | 'down') => {
    const jobId = resolveQueueJobId(job);
    if (!jobId) {
      return;
    }

    const currentPosition = Number(job.queuePosition) || 1;
    const nextPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1;
    const clampedPosition = Math.max(1, Math.min(queueSize, nextPosition));
    if (clampedPosition === currentPosition) {
      return;
    }

    reorderMutation.mutate({ jobId, newPosition: clampedPosition });
  };

  return (
    <Card>
      <CardHeader
        title={t('title')}
        description={t('subtitle')}
        icon={Server}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline">{t('queueSize', { count: summary.queueSize })}</Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            {t('actions.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <UsersRound size={14} />
              {t('summary.queueSizeLabel')}
            </div>
            <p className="text-2xl font-semibold text-gray-900">{summary.queueSize}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <Server size={14} />
              {t('summary.jobsAheadLabel')}
            </div>
            <p className="text-2xl font-semibold text-gray-900">{summary.avgJobsAhead}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <Timer size={14} />
              {t('summary.nearestEtaLabel')}
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatEta(summary.nearestEta)}</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span>{t('livePolling', { seconds: 5 })}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.scanId')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.tool')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.position')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.jobsAhead')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.estimate')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <TableSkeletonRows columns={7} />
              ) : isError ? (
                <TableErrorRow
                  columns={7}
                  title={error instanceof Error ? error.message : tCommon('error')}
                  retryLabel={tCommon('retry')}
                  onRetry={() => refetch()}
                />
              ) : jobs.length === 0 ? (
                <TableEmptyRow columns={7} title={t('empty')} />
              ) : (
                jobs.map((job) => (
                  <tr key={job.scanToolId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">{job.scanId}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{job.toolName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{job.queuePosition}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{job.jobsAheadCount ?? 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{job.userEmail || job.userId}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {job.estimatedFinishAt ? new Date(job.estimatedFinishAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveJob(job, 'up')}
                          disabled={reorderMutation.isPending || job.queuePosition <= 1}
                          className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowUp size={16} />
                          {t('actions.moveUp')}
                        </button>
                        <button
                          type="button"
                          onClick={() => moveJob(job, 'down')}
                          disabled={reorderMutation.isPending || job.queuePosition >= queueSize}
                          className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowDown size={16} />
                          {t('actions.moveDown')}
                        </button>
                        {job.vpsJobId ? (
                          <button
                            onClick={() => setJobToRemove(job.vpsJobId || null)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                            {t('actions.delete')}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ConfirmationDialog
          isOpen={Boolean(jobToRemove)}
          title={t('actions.delete')}
          description={t('actions.deleteConfirm')}
          confirmLabel={deleteMutation.isPending ? tConfirm('processing') : t('actions.delete')}
          cancelLabel={tConfirm('cancel')}
          onClose={() => {
            if (!deleteMutation.isPending) {
              setJobToRemove(null);
            }
          }}
          onConfirm={() => {
            if (!jobToRemove) {
              return;
            }

            deleteMutation.mutate(jobToRemove, {
              onSettled: () => setJobToRemove(null),
            });
          }}
          isPending={deleteMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}
