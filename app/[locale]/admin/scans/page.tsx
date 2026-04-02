'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, Badge, Button, Input, Select } from '@/components/scans/ui';
import { Download, Eye, ShieldCheck, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { adminService } from '@/lib/admin/adminService';
import { toast } from 'sonner';
import { TableEmptyRow, TableErrorRow, TableSkeletonRows } from '@/components/common/AsyncStates';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

type PendingAction =
  | { type: 'cancel-all' }
  | { type: 'force-fail'; scanId: string }
  | null;

export default function AdminScansPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('admin.scans');
  const tCommon = useTranslations('common.states');
  const tConfirm = useTranslations('common.confirmation');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [exportingScanId, setExportingScanId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-scans', page],
    queryFn: () => adminService.scans.list(page, 50),
  });

  const cancelAllMutation = useMutation({
    mutationFn: () => adminService.scans.cancelAll(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-scans'] });
      await refetch();
      toast.success(t('actions.cancelAllSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('actions.cancelAllError'));
    },
  });

  const forceFailMutation = useMutation({
    mutationFn: (id: string) => adminService.scans.forceFail(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-scans'] });
      await refetch();
      toast.success(t('actions.forceFailSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.message || t('actions.forceFailError'));
    },
  });

  const exportPdfMutation = useMutation({
    mutationFn: (id: string) => adminService.scans.exportPdf(id),
    onSuccess: (blob, id) => {
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `admin-scan-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      setExportingScanId(null);
      toast.success(t('actions.exportSuccess'));
    },
    onError: (error: any) => {
      setExportingScanId(null);
      toast.error(error?.message || t('actions.exportError'));
    },
  });

  const scans = data?.items ?? [];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredScans = useMemo(
    () =>
      scans.filter((scan) => {
        const statusMatches =
          statusFilter === 'all' || (scan.status || '').toLowerCase() === statusFilter.toLowerCase();
        const textMatches =
          normalizedSearch.length === 0 ||
          scan.id.toLowerCase().includes(normalizedSearch) ||
          (scan.targetId || '').toLowerCase().includes(normalizedSearch) ||
          (scan.requestedByUserId || '').toLowerCase().includes(normalizedSearch);

        return statusMatches && textMatches;
      }),
    [scans, statusFilter, normalizedSearch]
  );

  return (
    <Card>
      <CardHeader title={t('title')} description={t('subtitle')} icon={ShieldCheck}>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setPendingAction({ type: 'cancel-all' })}
          disabled={cancelAllMutation.isPending}
        >
          {t('actions.cancelAll')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t('filters.searchPlaceholder')}
          />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{t('filters.allStatuses')}</option>
            <option value="pending">{t('filters.status.pending')}</option>
            <option value="running">{t('filters.status.running')}</option>
            <option value="completed">{t('filters.status.completed')}</option>
            <option value="failed">{t('filters.status.failed')}</option>
            <option value="canceled">{t('filters.status.canceled')}</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/8">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t('columns.id')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t('columns.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t('columns.targetId')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t('columns.requestedAt')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t('columns.startedAt')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t('columns.finishedAt')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-transparent">
              {isLoading ? (
                <TableSkeletonRows columns={7} />
              ) : isError ? (
                <TableErrorRow
                  columns={7}
                  title={error instanceof Error ? error.message : tCommon('error')}
                  retryLabel={tCommon('retry')}
                  onRetry={() => refetch()}
                />
              ) : scans.length === 0 ? (
                <TableEmptyRow columns={7} title={t('empty')} />
              ) : filteredScans.length === 0 ? (
                <TableEmptyRow columns={7} title={t('emptyFiltered')} />
              ) : (
                filteredScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-white/7">
                    <td className="px-6 py-4 text-sm text-text-secondary">{scan.id}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge variant="outline">{scan.status || '-'}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{scan.targetId || '-'}</td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {scan.requestedAt ? new Date(scan.requestedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {scan.finishedAt ? new Date(scan.finishedAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          href={`/${locale}/admin/scans/${scan.id}`}
                          className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"
                        >
                          <Eye size={16} />
                          {t('actions.details')}
                        </Link>
                        <button
                          onClick={() => setPendingAction({ type: 'force-fail', scanId: scan.id })}
                          className="inline-flex items-center gap-1 text-status-danger hover:text-status-danger/80"
                        >
                          <XCircle size={16} />
                          {t('actions.forceFail')}
                        </button>
                        <button
                          onClick={() => {
                            setExportingScanId(scan.id);
                            exportPdfMutation.mutate(scan.id);
                          }}
                          data-testid={`admin-scan-export-${scan.id}`}
                          disabled={exportingScanId === scan.id}
                          className="inline-flex items-center gap-1 text-status-success hover:text-status-success/80 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Download size={16} />
                          {exportingScanId === scan.id ? t('actions.exporting') : t('actions.export')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between pt-4">
          <div className="text-xs text-text-muted">
            {t('pagination', { page, total: data?.totalCount ?? 0 })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              {t('actions.prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(data?.pageNumber ?? 1) * (data?.pageSize ?? 50) >= (data?.totalCount ?? 0)}
              onClick={() => setPage((prev) => prev + 1)}
            >
              {t('actions.next')}
            </Button>
          </div>
        </div>
      </CardContent>

      <ConfirmationDialog
        isOpen={Boolean(pendingAction)}
        title={
          pendingAction?.type === 'force-fail'
            ? t('actions.forceFail')
            : t('actions.cancelAll')
        }
        description={
          pendingAction?.type === 'force-fail'
            ? t('actions.forceFailConfirm')
            : t('actions.cancelAllConfirm')
        }
        warningMessage={
          pendingAction?.type === 'cancel-all' ? t('actions.cancelAllStrongWarning') : undefined
        }
        confirmationKeyword={
          pendingAction?.type === 'cancel-all' ? t('actions.cancelAllConfirmToken') : undefined
        }
        confirmationPrompt={
          pendingAction?.type === 'cancel-all' ? t('actions.cancelAllTypePrompt', { token: t('actions.cancelAllConfirmToken') }) : undefined
        }
        confirmationPlaceholder={
          pendingAction?.type === 'cancel-all' ? t('actions.cancelAllTypePlaceholder') : undefined
        }
        confirmLabel={
          pendingAction?.type === 'force-fail'
            ? (forceFailMutation.isPending ? tConfirm('processing') : t('actions.forceFail'))
            : (cancelAllMutation.isPending ? tConfirm('processing') : t('actions.cancelAll'))
        }
        cancelLabel={tConfirm('cancel')}
        onClose={() => {
          if (!cancelAllMutation.isPending && !forceFailMutation.isPending) {
            setPendingAction(null);
          }
        }}
        onConfirm={() => {
          if (pendingAction?.type === 'force-fail') {
            forceFailMutation.mutate(pendingAction.scanId, {
              onSettled: () => setPendingAction(null),
            });
            return;
          }

          if (pendingAction?.type === 'cancel-all') {
            cancelAllMutation.mutate(undefined, {
              onSettled: () => setPendingAction(null),
            });
          }
        }}
        isPending={cancelAllMutation.isPending || forceFailMutation.isPending}
      />
    </Card>
  );
}
